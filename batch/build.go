package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"
)

type rawTx struct {
	BlockHeight int    `json:"block_height"`
	Index       int    `json:"index"`
	Hash        string `json:"hash"`
	Success     bool   `json:"success"`
	GasFee      *struct {
		Amount int64  `json:"amount"`
		Denom  string `json:"denom"`
	} `json:"gas_fee"`
	Signatures []struct {
		PubKey string `json:"pub_key"`
	} `json:"signatures"`
	Messages []struct {
		Value struct {
			Typename    string `json:"__typename"`
			Caller      string `json:"caller"`
			PkgPath     string `json:"pkg_path"`
			Func        string `json:"func"`
			FromAddress string `json:"from_address"`
			Creator     string `json:"creator"`
			Approver    string `json:"approver"`
			Package     *struct {
				Path string `json:"path"`
			} `json:"package"`
		} `json:"value"`
	} `json:"messages"`
	Response struct {
		Events []struct {
			Typename string `json:"__typename"`
			Type     string `json:"type"`
			PkgPath  string `json:"pkg_path"`
			Attrs    []struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			} `json:"attrs"`
		} `json:"events"`
	} `json:"response"`
}

// actor is the account acting in the tx: the first message's caller / sender /
// creator / approver. Falls back to the signer, which only chunks fetched from
// an indexer with the `signatures` extension have.
func (t *rawTx) actor() string {
	for _, m := range t.Messages {
		v := m.Value
		for _, a := range []string{v.Caller, v.FromAddress, v.Creator, v.Approver} {
			if a != "" {
				return a
			}
		}
	}
	if len(t.Signatures) > 0 {
		return t.Signatures[0].PubKey
	}
	return ""
}

func (t *rawTx) isSwap() bool {
	for _, e := range t.Response.Events {
		if e.Typename == "GnoEvent" && e.Type == "Swap" && strings.HasPrefix(e.PkgPath, "gno.land/r/gnoswap/") {
			return true
		}
	}
	return false
}

type acc struct {
	txs       int
	firstAt   time.Time
	firstHash string
	firstPos  [2]int               // (height, index) of the first tx, for arrival order
	days      map[int]bool         // UTC days (since season start) with activity, for streaks
	daily     []int                // txs per UTC day of the season, for the calendar
	hours     [24]int              // txs per UTC hour of the day, for the clock card
	dayTxs    map[int][]dayTx      // the first dayTxCap txs of each active day, for the calendar's day list
	moments   map[string]time.Time // first swap / collect / deploy, 100th tx (see milestones)
	gasUgnot  int64
	swaps     int
	weekly    []int
	defi      defiStats                 // GnoSwap beyond swaps (activity.go)
	pairs     map[[2]string]int         // token pair → swaps, for defi.TopPair
	gov       govStats                  // governance votes, proposals, GNS delegations
	calls     map[string]map[string]int // pkg_path → func → count
	deployed  []string
	lastAt    time.Time
	actions   map[string]int // message kind → count, for the bot heuristic
	cats      map[string]int // message category → count, for personas
	totalMsgs int
	topActPct float64
	perDay    float64
	isBot     bool
}

// ---- JSON contract (keep in sync with web/) ----

type realmStat struct {
	Path    string `json:"path"`
	TopFunc string `json:"topFunc"`
	Calls   int    `json:"calls"`
	Order   int    `json:"order,omitempty"`   // the address's place among the realm's callers by first call, 1 = first (owner view only; none for its deployer and bots)
	Callers int    `json:"callers,omitempty"` // addresses that have called the realm, its deployer and bots not counted
}

type wrapped struct {
	Address        string        `json:"address"` // "" behind a share link (see redact)
	ShareID        string        `json:"shareId"`
	Shared         bool          `json:"shared,omitempty"`
	DataAsOf       string        `json:"dataAsOf"`
	Final          bool          `json:"final,omitempty"` // the season is over and every in-season tx is in
	Season         Season        `json:"season"`
	FirstTx        firstTx       `json:"firstTx"`
	TxCount        int           `json:"txCount"`
	Percentile     int           `json:"percentile"`
	TopRealms      []realmStat   `json:"topRealms"`
	RealmCount     int           `json:"realmCount"` // distinct realms called
	DeployedRealms []string      `json:"deployedRealms"`
	Swaps          swaps         `json:"swaps"`
	DeFi           *defiStats    `json:"defi,omitempty"`       // GnoSwap beyond swaps
	Governance     *govStats     `json:"governance,omitempty"` // votes, proposals, GNS delegations
	Builder        []realmReport `json:"builder,omitempty"`    // deployedRealms with their use, most-called first
	FailedTxs      int           `json:"failedTxs,omitempty"`  // failed txs this season (txCount counts successful ones)
	GasFeeGnot     float64       `json:"gasFeeGnot"`
	Persona        persona       `json:"persona"`
	PersonaRank    *personaRank  `json:"personaRank,omitempty"` // within the persona; none for First Steps and bots
	Calendar       calendar      `json:"calendar"`
	Arrival        arrival       `json:"arrival"`
	Achievements   []achievement `json:"achievements"`
	Milestones     []milestone   `json:"milestones"`
	Progress       []progress    `json:"progress,omitempty"` // achievements still in reach while the season is live (owner view only)
	Hours          []int         `json:"hours,omitempty"`    // txs per UTC hour, [0] = 00:00–00:59 (owner view only; the web shows the viewer's time zone)
}

// calendar: activity by day. The owner gets txs per UTC day; a share link only gets active days per
// week (see redact), since a day-by-day pattern can be matched against the chain.
type calendar struct {
	Daily         []int `json:"daily,omitempty"` // txs per UTC day, daily[0] = season.start
	Weeks         []int `json:"weeks,omitempty"` // share view: active days (0–7) per season week
	ActiveDays    int   `json:"activeDays"`
	LongestStreak int   `json:"longestStreak"`
}

type firstTx struct {
	Hash       string `json:"hash,omitempty"` // base64, as the indexer and gnoscan use it
	Date       string `json:"date"`
	MainnetDay int    `json:"mainnetDay"`
}

type swaps struct {
	Count  int   `json:"count"`
	Weekly []int `json:"weekly"`
}

type persona struct {
	ID    string  `json:"id"`
	Title string  `json:"title"`
	Line  string  `json:"line"`
	Share float64 `json:"share,omitempty"` // for category personas: share of messages in that category (0–1)
}

// ---- aggregation ----

type dataset struct {
	accs      map[string]*acc
	st        fetchState
	start     time.Time
	end       time.Time // exclusive
	weeks     int
	days      int                          // season length in days
	firstCall map[string]map[string][2]int // realm → caller → (height, index) of their first call, for Realm Pioneer
	deployer  map[string]string            // realm → the address that deployed it
	failed    map[string]int               // address → failed in-season txs (recaps count only successful ones)
	totalTxs  int                          // successful in-season txs with an actor (what recaps count)
	rawTxs    int                          // every cached tx, failed ones included: matches the chain's total_txs
}

func loadDataset(c config) (*dataset, error) {
	st, err := loadState(c)
	if err != nil {
		return nil, err
	}
	if st.FetchedTo <= 1 {
		return nil, fmt.Errorf("raw cache is empty; run `wrapped fetch` first")
	}
	start, err := time.Parse("2006-01-02", season.Start)
	if err != nil {
		return nil, fmt.Errorf("season.start: %w", err)
	}
	end, err := time.Parse("2006-01-02", season.End)
	if err != nil {
		return nil, fmt.Errorf("season.end: %w", err)
	}
	end = end.AddDate(0, 0, 1)
	d := &dataset{accs: map[string]*acc{}, failed: map[string]int{}, firstCall: map[string]map[string][2]int{}, deployer: map[string]string{}, st: st, start: start, end: end,
		weeks: int(math.Ceil(end.Sub(start).Hours() / 24 / 7)), days: int(end.Sub(start).Hours() / 24)}

	if err := readChunks(c, d.applyChunk); err != nil {
		return nil, err
	}
	d.markBots()
	return d, nil
}

// applyChunk adds a chunk's successful in-season txs.
func (d *dataset) applyChunk(ch chunk) error {
	times := make(map[int]time.Time, len(ch.Blocks))
	for _, b := range ch.Blocks {
		times[b.Height] = b.Time
	}
	d.rawTxs += len(ch.Txs)
	for _, raw := range ch.Txs {
		var t rawTx
		if err := json.Unmarshal(raw, &t); err != nil {
			return fmt.Errorf("height %d-%d: %w", ch.From, ch.To, err)
		}
		at, ok := times[t.BlockHeight]
		if !ok {
			return fmt.Errorf("no block time for height %d", t.BlockHeight)
		}
		if at.Before(d.start) || !at.Before(d.end) {
			continue
		}
		if !t.Success {
			if who := t.actor(); who != "" {
				if d.failed == nil {
					d.failed = map[string]int{}
				}
				d.failed[who]++
			}
			continue
		}
		d.add(&t, at)
	}
	return nil
}

func (d *dataset) add(t *rawTx, at time.Time) {
	who := t.actor()
	if who == "" {
		return
	}
	a := d.accs[who]
	if a == nil {
		a = &acc{firstAt: at, firstHash: t.Hash, firstPos: [2]int{t.BlockHeight, t.Index}, days: map[int]bool{}, moments: map[string]time.Time{}, weekly: make([]int, d.weeks), daily: make([]int, d.days), dayTxs: map[int][]dayTx{}, calls: map[string]map[string]int{}, actions: map[string]int{}, cats: map[string]int{}}
		d.accs[who] = a
	}
	d.totalTxs++
	a.txs++
	a.lastAt = at
	if t.GasFee != nil && t.GasFee.Denom == "ugnot" {
		a.gasUgnot += t.GasFee.Amount
	}
	day := int(at.Sub(d.start).Hours() / 24)
	a.days[day] = true
	a.daily[day]++
	a.hours[at.UTC().Hour()]++
	if len(a.dayTxs[day]) < dayTxCap {
		a.dayTxs[day] = append(a.dayTxs[day], summarize(t, at))
	}
	if a.txs == 100 {
		a.moment("tx-100", at)
	}
	for _, e := range t.Response.Events {
		if e.Typename == "GnoEvent" && strings.HasPrefix(e.PkgPath, "gno.land/r/gnoswap/router") && (e.Type == "ExactInSwap" || e.Type == "ExactOutSwap") {
			var in, out string
			for _, kv := range e.Attrs {
				switch kv.Key {
				case "input":
					in = kv.Value
				case "output":
					out = kv.Value
				}
			}
			a.trackSwapPair(in, out)
		}
	}
	if t.isSwap() {
		a.swaps++
		a.weekly[int(at.Sub(d.start).Hours()/24/7)]++
		a.moment("first-swap", at)
	}
	for _, m := range t.Messages {
		v := m.Value
		a.totalMsgs++
		cat := messageCategory(v.Typename, v.PkgPath, v.Func)
		a.cats[cat]++
		if cat == "collect" {
			a.moment("first-collect", at)
		}
		if v.Typename == "MsgCall" {
			a.actions["call "+v.Func]++ // by function name, so one bot driving many realms still counts as one
		} else {
			a.actions[v.Typename]++
		}
		switch v.Typename {
		case "MsgCall":
			if a.calls[v.PkgPath] == nil {
				a.calls[v.PkgPath] = map[string]int{}
			}
			a.calls[v.PkgPath][v.Func]++
			a.track(v.PkgPath, v.Func)
			if d.firstCall[v.PkgPath] == nil {
				d.firstCall[v.PkgPath] = map[string][2]int{}
			}
			if _, ok := d.firstCall[v.PkgPath][who]; !ok {
				d.firstCall[v.PkgPath][who] = [2]int{t.BlockHeight, t.Index}
			}
		case "MsgAddPackage":
			if v.Package != nil && strings.Contains(v.Package.Path, "/r/") && !slices.Contains(a.deployed, v.Package.Path) {
				a.deployed = append(a.deployed, v.Package.Path)
				a.moment("first-deploy", at)
				if _, ok := d.deployer[v.Package.Path]; !ok {
					d.deployer[v.Package.Path] = who
				}
			}
		}
	}
}

// dayTx: one line of the calendar's day list (owner view only: the hash leads to the address).
type dayTx struct {
	Hash string `json:"hash"`
	Time string `json:"time"`           // HH:MM, UTC
	Kind string `json:"kind"`           // call | send | deploy | run | other: the first message
	Path string `json:"path,omitempty"` // realm or package (call, deploy, run)
	Func string `json:"func,omitempty"` // call
	Msgs int    `json:"msgs,omitempty"` // messages in the tx when more than one
}

// Per day. On 2026-10-20 data 99.7% of address-days have at most 100 txs; the rest are mostly bots
// with thousands a day, which the web links to on Gnoscan instead.
const dayTxCap = 100

func summarize(t *rawTx, at time.Time) dayTx {
	s := dayTx{Hash: t.Hash, Time: at.UTC().Format("15:04"), Kind: "other"}
	if len(t.Messages) > 1 {
		s.Msgs = len(t.Messages)
	}
	if len(t.Messages) > 0 {
		v := t.Messages[0].Value
		switch v.Typename {
		case "MsgCall":
			s.Kind, s.Path, s.Func = "call", v.PkgPath, v.Func
		case "BankMsgSend":
			s.Kind = "send"
		case "MsgAddPackage":
			s.Kind = "deploy"
			if v.Package != nil {
				s.Path = v.Package.Path
			}
		case "MsgRun":
			s.Kind = "run"
		}
	}
	return s
}

// moment records the first time something happened (txs arrive in chain order).
func (a *acc) moment(id string, at time.Time) {
	if _, ok := a.moments[id]; !ok {
		a.moments[id] = at
	}
}

// markBots flags automated accounts: many txs that are either nearly all the
// same action, or sent faster than a person plausibly would. They still get a
// recap but are excluded from the percentile ranking.
// TODO: tune personaRules.Bot* with `wrapped stats`.
func (d *dataset) markBots() {
	for _, a := range d.accs {
		top := 0
		for _, n := range a.actions {
			top = max(top, n)
		}
		if a.totalMsgs > 0 {
			a.topActPct = float64(top) / float64(a.totalMsgs)
		}
		days := a.lastAt.Sub(a.firstAt).Hours()/24 + 1
		a.perDay = float64(a.txs) / days
		a.isBot = a.txs >= personaRules.BotMinTxs &&
			(a.topActPct >= personaRules.BotMinTopActionPct || a.perDay >= personaRules.BotMinTxsPerDay)
	}
}

// percentiles: share of ranked (non-bot) accounts with strictly fewer txs.
func (d *dataset) percentiles() map[string]int {
	var counts []int
	for _, a := range d.accs {
		if !a.isBot {
			counts = append(counts, a.txs)
		}
	}
	sort.Ints(counts)
	out := make(map[string]int, len(d.accs))
	for addr, a := range d.accs {
		below := sort.SearchInts(counts, a.txs)
		p := 0
		if len(counts) > 0 {
			p = below * 100 / len(counts)
		}
		out[addr] = min(p, 99)
	}
	return out
}

// final reports whether the season is over: the cache holds a block from after its last day, so no
// in-season tx can still arrive. Final recaps are dated the season's last day, not the chain tip.
func (d *dataset) final() (bool, string) {
	if !d.st.TipTime.Before(d.end) {
		return true, season.End
	}
	return false, d.st.TipTime.UTC().Format("2006-01-02")
}

// mainnetDay counts 24h periods since genesis, starting at Day 1.
func (d *dataset) mainnetDay(t time.Time) int {
	return int(t.Sub(d.st.GenesisTime).Hours()/24) + 1
}

var personas = map[string]persona{
	"builder":          {ID: "builder", Title: "Builder", Line: "You shipped code to mainnet."},
	"day-one-explorer": {ID: "day-one-explorer", Title: "Day-One Explorer", Line: "You were here before the map was drawn."},
	"realm-hopper":     {ID: "realm-hopper", Title: "Realm Hopper", Line: "You never stayed in one realm for long."},
	"defi-pilot":       {ID: "defi-pilot", Title: "DeFi Pilot", Line: "Swaps, pools and stakes: GnoSwap was your home base."},
	"collector":        {ID: "collector", Title: "Collector", Line: "You minted and bought your way across gno.land."},
	"player-one":       {ID: "player-one", Title: "Player One", Line: "On-chain games got the most of your moves."},
	"gnot-courier":     {ID: "gnot-courier", Title: "GNOT Courier", Line: "You kept GNOT moving between wallets."},
	"first-steps":      {ID: "first-steps", Title: "First Steps", Line: "Everyone starts somewhere."},
}

// personaOrder lists persona ids as `wrapped stats` prints them.
var personaOrder = []string{"builder", "day-one-explorer", "realm-hopper", "defi-pilot", "collector", "player-one", "gnot-courier", "first-steps"}

// choosePersona: first match wins. The dominant message category decides before tx count, so a
// single NFT mint is a Collector; only accounts that just moved GNOT once or twice are First Steps.
func choosePersona(a *acc, day int) persona {
	top, n := "", 0
	for _, c := range []string{"defi", "collect", "play", "transfer", "other"} { // fixed order: ties are stable
		if a.cats[c] > n {
			top, n = c, a.cats[c]
		}
	}
	share := 0.0
	if a.totalMsgs > 0 {
		share = float64(n) / float64(a.totalMsgs)
	}
	dominant := share >= personaRules.CategoryMinShare
	withShare := func(id string) persona {
		p := personas[id]
		p.Share = math.Round(share*100) / 100
		return p
	}
	switch {
	case len(a.deployed) > 0:
		return personas["builder"]
	case day <= personaRules.DayOneMaxDay:
		return personas["day-one-explorer"]
	case len(a.calls) >= personaRules.HopperMinRealms:
		return personas["realm-hopper"]
	case dominant && top == "defi":
		return withShare("defi-pilot")
	case dominant && top == "collect":
		return withShare("collector")
	case dominant && top == "play":
		return withShare("player-one")
	case top == "transfer" && a.txs >= personaRules.CourierMinTxs:
		return withShare("gnot-courier")
	}
	return personas["first-steps"]
}

// personaRule describes when a persona applies, for the /personas page (GET /v1/{season}/personas).
type personaRule struct {
	Kind     string  `json:"kind"` // deployed | firstDay | realms | share | transfers | fallback
	Category string  `json:"category,omitempty"`
	Min      float64 `json:"min,omitempty"`
	Max      float64 `json:"max,omitempty"`
}

func personaRuleFor(id string) personaRule {
	r := personaRules
	switch id {
	case "builder":
		return personaRule{Kind: "deployed", Min: 1}
	case "day-one-explorer":
		return personaRule{Kind: "firstDay", Max: float64(r.DayOneMaxDay)}
	case "realm-hopper":
		return personaRule{Kind: "realms", Min: float64(r.HopperMinRealms)}
	case "defi-pilot":
		return personaRule{Kind: "share", Category: "defi", Min: r.CategoryMinShare}
	case "collector":
		return personaRule{Kind: "share", Category: "collect", Min: r.CategoryMinShare}
	case "player-one":
		return personaRule{Kind: "share", Category: "play", Min: r.CategoryMinShare}
	case "gnot-courier":
		return personaRule{Kind: "transfers", Min: float64(r.CourierMinTxs)}
	}
	return personaRule{Kind: "fallback"}
}

func topRealms(a *acc, n int) []realmStat {
	out := make([]realmStat, 0, len(a.calls))
	for path, fns := range a.calls {
		r := realmStat{Path: path}
		best := -1
		for fn, c := range fns {
			r.Calls += c
			if c > best || (c == best && fn < r.TopFunc) {
				best, r.TopFunc = c, fn
			}
		}
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Calls != out[j].Calls {
			return out[i].Calls > out[j].Calls
		}
		return out[i].Path < out[j].Path
	})
	return out[:min(n, len(out))]
}

// render turns the dataset into every output file, keyed by path relative to out/:
//
//	<season>/<xx>.json         address → recap (owner view)
//	<season>/share/<yy>.json   share ID → redacted recap (share links)
//	<season>/days/<xx>.json    address → date → that day's first txs (calendar day list, owner only)
//	<season>/personas.json     persona rules + counts
//	<season>/season.json       the whole chain's season (see seasonStats)
//	<season>/meta.json
func (d *dataset) render(ids *shareIDs, updatedAt time.Time) (map[string][]byte, error) {
	d.markBots()
	final, asOf := d.final()
	pct := d.percentiles()
	counts := map[string]int{}

	personaOf := map[string]string{}
	chosen := map[string]persona{}
	for addr, a := range d.accs {
		p := choosePersona(a, d.mainnetDay(a.firstAt))
		chosen[addr], personaOf[addr] = p, p.ID
	}
	ranks := personaRanks(d.accs, personaOf)
	callers := d.callers()
	order := make(map[string]map[string]int, len(callers)) // realm → caller → place, 1 = first
	for path, who := range callers {
		order[path] = make(map[string]int, len(who))
		for i, addr := range who {
			order[path][addr] = i + 1
		}
	}
	ex := d.extras(callers)
	reports := d.realmReports()
	achCounts := map[string]int{}

	shards := map[string]map[string]wrapped{}
	days := map[string]map[string]map[string][]dayTx{}
	shared := map[string]map[string]wrapped{}
	for addr, a := range d.accs {
		day := d.mainnetDay(a.firstAt)
		w := wrapped{
			Address:        addr,
			ShareID:        ids.get(addr),
			DataAsOf:       asOf,
			Final:          final,
			Season:         season,
			FirstTx:        firstTx{Date: a.firstAt.UTC().Format("2006-01-02"), MainnetDay: day, Hash: a.firstHash},
			TxCount:        a.txs,
			Percentile:     pct[addr],
			TopRealms:      topRealms(a, 3),
			RealmCount:     len(a.calls),
			DeployedRealms: append([]string{}, a.deployed...),
			Swaps:          swaps{Count: a.swaps, Weekly: a.weekly},
			DeFi:           a.defiFor(),
			Governance:     govOrNil(a.gov),
			Builder:        builderReport(a.deployed, reports),
			FailedTxs:      d.failed[addr],
			GasFeeGnot:     roundGnot(a.gasUgnot),
			Persona:        chosen[addr],
			PersonaRank:    ranks[addr],
			Calendar:       calendar{Daily: a.daily, ActiveDays: len(a.days), LongestStreak: longestStreak(a.days)},
			Arrival:        ex.arrival[addr],
			Achievements:   orEmpty(ex.achievements[addr]),
			Milestones:     orEmpty(ex.milestones[addr]),
			Hours:          a.hours[:],
		}
		if !final {
			w.Progress = d.progressFor(a, w.Achievements)
		}
		for i := range w.TopRealms {
			r := &w.TopRealms[i]
			r.Order, r.Callers = order[r.Path][addr], len(callers[r.Path])
		}
		if err := validate(w, d.weeks, d.days); err != nil {
			return nil, fmt.Errorf("%s: %w", addr, err)
		}
		counts[w.Persona.ID]++
		for _, a := range w.Achievements {
			achCounts[a.ID]++
		}
		put(shards, shardKey(addr), addr, w)
		byDate := make(map[string][]dayTx, len(a.dayTxs))
		for i, txs := range a.dayTxs {
			byDate[d.start.AddDate(0, 0, i).Format("2006-01-02")] = txs
		}
		if days[shardKey(addr)] == nil {
			days[shardKey(addr)] = map[string]map[string][]dayTx{}
		}
		days[shardKey(addr)][addr] = byDate
		put(shared, w.ShareID[:2], w.ShareID, redact(w))
	}

	files := map[string][]byte{}
	for key, m := range shards {
		files[filepath.Join(season.ID, key+".json")], _ = json.Marshal(m)
	}
	for key, m := range shared {
		files[filepath.Join(season.ID, "share", key+".json")], _ = json.Marshal(m)
	}
	type personaInfo struct {
		persona
		Rule   personaRule `json:"rule"`
		RankBy string      `json:"rankBy,omitempty"`
		Count  int         `json:"count"`
	}
	var list []personaInfo
	for _, id := range personaOrder {
		rankBy, _, _, _ := rankMetric(id, &acc{})
		list = append(list, personaInfo{persona: personas[id], Rule: personaRuleFor(id), RankBy: rankBy, Count: counts[id]})
	}
	files[filepath.Join(season.ID, "personas.json")], _ = json.MarshalIndent(map[string]any{
		"season": season, "dataAsOf": asOf, "final": final, "addresses": len(d.accs), "personas": list, "achievements": achCounts,
	}, "", "  ")
	for key, m := range days {
		files[filepath.Join(season.ID, "days", key+".json")], _ = json.Marshal(m)
	}
	files[filepath.Join(season.ID, "season.json")], _ = json.MarshalIndent(d.seasonStats(asOf, final), "", "  ")
	files[filepath.Join(season.ID, "meta.json")], _ = json.MarshalIndent(map[string]any{
		"dataAsOf": asOf, "final": final, "updatedAt": updatedAt.UTC().Format(time.RFC3339), "season": season, "addresses": len(d.accs),
		"transactions": d.totalTxs, "fetchedToHeight": d.st.FetchedTo - 1, "shards": len(shards),
	}, "", "  ")
	return files, nil
}

func orEmpty[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}

func put(m map[string]map[string]wrapped, shard, key string, w wrapped) {
	if m[shard] == nil {
		m[shard] = map[string]wrapped{}
	}
	m[shard][key] = w
}

// outWriter writes render output, skipping files whose bytes didn't change since the last write.
// Each write is atomic, so the API never sees a partial file; files no longer produced are removed.
type outWriter struct {
	dir  string
	last map[string][32]byte
}

func newOutWriter(c config) *outWriter {
	return &outWriter{dir: filepath.Join(c.DataDir, "out"), last: map[string][32]byte{}}
}

func (o *outWriter) write(files map[string][]byte) (int, error) {
	changed := 0
	for rel, b := range files {
		sum := sha256.Sum256(b)
		if o.last[rel] == sum {
			continue
		}
		path := filepath.Join(o.dir, rel)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return changed, err
		}
		if err := writeFileAtomic(path, b); err != nil {
			return changed, err
		}
		o.last[rel] = sum
		changed++
	}
	for _, pattern := range []string{filepath.Join(season.ID, "*.json"), filepath.Join(season.ID, "share", "*.json"), filepath.Join(season.ID, "days", "*.json")} {
		stale, _ := filepath.Glob(filepath.Join(o.dir, pattern))
		for _, p := range stale {
			rel, _ := filepath.Rel(o.dir, p)
			if _, ok := files[rel]; !ok {
				if err := os.Remove(p); err != nil {
					return changed, err
				}
				delete(o.last, rel)
			}
		}
	}
	return changed, nil
}

func build(c config) error {
	d, err := loadDataset(c)
	if err != nil {
		return err
	}
	ids, err := loadShareIDs(c)
	if err != nil {
		return err
	}
	files, err := d.render(ids, time.Now())
	if err != nil {
		return err
	}
	if err := ids.save(); err != nil { // IDs first: a written share file must never point at an unsaved ID
		return err
	}
	n, err := newOutWriter(c).write(files)
	if err != nil {
		return err
	}
	log.Printf("built %d addresses (%d txs in season), wrote %d files, data as of %s", len(d.accs), d.totalTxs, n, d.st.TipTime.UTC().Format("2006-01-02"))
	return nil
}

// shardKey groups addresses by the two characters after "g1" (≤1,024 files).
func shardKey(addr string) string {
	if len(addr) < 4 || !strings.HasPrefix(addr, "g1") {
		return "_"
	}
	return addr[2:4]
}

// validate enforces the contract the web app relies on. A bad file must fail
// the build, not reach users.
func validate(w wrapped, weeks, days int) error {
	switch {
	case w.Season.ID == "" || w.Season.Start == "" || w.Season.End == "":
		return fmt.Errorf("season is incomplete")
	case len(w.Swaps.Weekly) != weeks:
		return fmt.Errorf("swaps.weekly has %d entries, season has %d weeks", len(w.Swaps.Weekly), weeks)
	case len(w.Calendar.Daily) != days:
		return fmt.Errorf("calendar.daily has %d entries, season has %d days", len(w.Calendar.Daily), days)
	case w.Hours != nil && len(w.Hours) != 24:
		return fmt.Errorf("hours has %d entries, want 24", len(w.Hours))
	case w.TxCount < 1 || w.FirstTx.MainnetDay < 1:
		return fmt.Errorf("txCount/firstTx out of range")
	case w.Percentile < 0 || w.Percentile > 99:
		return fmt.Errorf("percentile %d out of range", w.Percentile)
	}
	return nil
}

func roundGnot(ugnot int64) float64 {
	v, _ := strconv.ParseFloat(strconv.FormatFloat(float64(ugnot)/1e6, 'f', 4, 64), 64)
	return v
}
