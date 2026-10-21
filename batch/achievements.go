package main

import (
	"sort"
	"time"
)

// Arrival order, achievements and milestones. Thresholds that depend on everyone (gas percentiles)
// are taken over non-bot addresses, like the activity percentile.

// arrival: the address's place in mainnet arrival order (by its first tx). The exact order is a
// direct lookup into public chain data, so share views keep only the tier (see redact).
type arrival struct {
	Order int `json:"order,omitempty"` // 1 = first; 0 behind a share link
	Of    int `json:"of"`
	Tier  int `json:"tier,omitempty"` // 100 | 500 | 1000 | 2500: "one of the first N"; 0 = none
}

type achievement struct {
	ID     string   `json:"id"`
	Value  float64  `json:"value,omitempty"`  // early: tier; streak: days; century: txs; pioneer: realms; citizen: votes + proposals
	Realms []string `json:"realms,omitempty"` // pioneer: up to 3, most-used first (owner view only, see redact)
}

// progress: an achievement the address doesn't have yet but can still earn this season, with how
// far along it is. Only the ones that depend on the address alone: Early Arrival and Realm Pioneer
// are decided by when others came, Gas Saver and Validators' Friend by everyone's gas.
type progress struct {
	ID      string   `json:"id"` // century | streak | triple-threat | citizen
	Have    int      `json:"have"`
	Need    int      `json:"need"`
	Missing []string `json:"missing,omitempty"` // triple-threat: which of defi | collect | play are still to try
}

type milestone struct {
	ID   string `json:"id"` // first-swap | first-collect | first-deploy | tx-100
	Date string `json:"date"`
}

var arrivalTiers = []int{100, 500, 1000, 2500}

const (
	streakMin  = 3   // consecutive active UTC days
	centuryMin = 100 // txs
	gasMinTxs  = 5   // Gas Saver needs at least this many txs to mean anything
	gasLowPct  = 10  // Gas Saver: average gas per tx in the lowest 10%
	gasHighPct = 90  // Validators' Friend: total gas in the top 10%

	// Realm Pioneer: among the first pioneerSlots addresses to call a realm that at least
	// pioneerMinCallers addresses have called (its deployer and bots don't count or take a slot).
	// On 2026-10-20 data, 20 realms qualify: at most 200 pioneers out of ~5,000 addresses.
	pioneerSlots      = 10
	pioneerMinCallers = 50
	pioneerShown      = 3
)

type extras struct {
	arrival      map[string]arrival
	achievements map[string][]achievement
	milestones   map[string][]milestone
}

func (d *dataset) extras(callers map[string][]string) extras {
	x := extras{arrival: map[string]arrival{}, achievements: map[string][]achievement{}, milestones: map[string][]milestone{}}

	// arrival order: by (height, index) of the first tx
	addrs := make([]string, 0, len(d.accs))
	for addr := range d.accs {
		addrs = append(addrs, addr)
	}
	sort.Slice(addrs, func(i, j int) bool {
		a, b := d.accs[addrs[i]].firstPos, d.accs[addrs[j]].firstPos
		return a[0] < b[0] || (a[0] == b[0] && a[1] < b[1])
	})
	for i, addr := range addrs {
		ar := arrival{Order: i + 1, Of: len(addrs)}
		for _, t := range arrivalTiers {
			if ar.Order <= t {
				ar.Tier = t
				break
			}
		}
		x.arrival[addr] = ar
	}

	// gas thresholds over non-bots
	var perTx, totals []float64
	for _, a := range d.accs {
		if a.isBot {
			continue
		}
		totals = append(totals, float64(a.gasUgnot))
		if a.txs >= gasMinTxs {
			perTx = append(perTx, float64(a.gasUgnot)/float64(a.txs))
		}
	}
	lowPerTx, highTotal := quantile(perTx, gasLowPct), quantile(totals, gasHighPct)
	pioneers := pioneers(callers)

	for addr, a := range d.accs {
		var got []achievement
		if t := x.arrival[addr].Tier; t > 0 && t <= 1000 {
			got = append(got, achievement{ID: "early", Value: float64(t)})
		}
		if s := longestStreak(a.days); s >= streakMin {
			got = append(got, achievement{ID: "streak", Value: float64(s)})
		}
		if a.cats["defi"] > 0 && a.cats["collect"] > 0 && a.cats["play"] > 0 {
			got = append(got, achievement{ID: "triple-threat"})
		}
		if a.txs >= gasMinTxs && len(perTx) > 0 && float64(a.gasUgnot)/float64(a.txs) <= lowPerTx {
			got = append(got, achievement{ID: "gas-saver"})
		}
		if a.gasUgnot > 0 && len(totals) > 0 && float64(a.gasUgnot) >= highTotal {
			got = append(got, achievement{ID: "validators-friend"})
		}
		if a.txs >= centuryMin {
			got = append(got, achievement{ID: "century", Value: float64(a.txs)})
		}
		if a.gov.Votes+a.gov.Proposals > 0 {
			got = append(got, achievement{ID: "citizen", Value: float64(a.gov.Votes + a.gov.Proposals)})
		}
		if realms := pioneers[addr]; len(realms) > 0 {
			got = append(got, achievement{ID: "pioneer", Value: float64(len(realms)), Realms: realms[:min(pioneerShown, len(realms))]})
		}
		x.achievements[addr] = got

		var ms []milestone
		for _, id := range []string{"first-swap", "first-collect", "first-deploy", "tx-100"} {
			if at, ok := a.moments[id]; ok {
				ms = append(ms, milestone{ID: id, Date: at.UTC().Format(time.DateOnly)})
			}
		}
		x.milestones[addr] = ms
	}
	return x
}

// callers lists each realm's callers in the order of their first call, leaving out its deployer
// and bots (Realm Pioneer's slots and the order shown on Top Realms both count only these).
func (d *dataset) callers() map[string][]string {
	out := make(map[string][]string, len(d.firstCall))
	for path, calls := range d.firstCall {
		var who []string
		for addr := range calls {
			if a := d.accs[addr]; a != nil && !a.isBot && addr != d.deployer[path] {
				who = append(who, addr)
			}
		}
		sort.Slice(who, func(i, j int) bool {
			a, b := calls[who[i]], calls[who[j]]
			return a[0] < b[0] || (a[0] == b[0] && a[1] < b[1])
		})
		out[path] = who
	}
	return out
}

// pioneers maps each Realm Pioneer to the realms they pioneered, the most-called (by distinct
// addresses) first.
func pioneers(callers map[string][]string) map[string][]string {
	type realm struct {
		path    string
		callers int
		first   []string
	}
	var realms []realm
	for path, who := range callers {
		if len(who) < pioneerMinCallers {
			continue
		}
		realms = append(realms, realm{path, len(who), who[:pioneerSlots]})
	}
	sort.Slice(realms, func(i, j int) bool {
		if realms[i].callers != realms[j].callers {
			return realms[i].callers > realms[j].callers
		}
		return realms[i].path < realms[j].path
	})
	out := map[string][]string{}
	for _, r := range realms {
		for _, addr := range r.first {
			out[addr] = append(out[addr], r.path)
		}
	}
	return out
}

// progressFor lists the reachable achievements the address hasn't earned (see progress).
// Streak counts the current run: the one that reaches the chain tip's day or the day before, since
// today can still be active.
func (d *dataset) progressFor(a *acc, earned []achievement) []progress {
	has := map[string]bool{}
	for _, e := range earned {
		has[e.ID] = true
	}
	var out []progress
	if !has["century"] {
		out = append(out, progress{ID: "century", Have: a.txs, Need: centuryMin})
	}
	if !has["streak"] {
		today := int(d.st.TipTime.Sub(d.start).Hours() / 24)
		out = append(out, progress{ID: "streak", Have: currentStreak(a.days, today), Need: streakMin})
	}
	if !has["triple-threat"] {
		p := progress{ID: "triple-threat", Need: 3}
		for _, c := range []string{"defi", "collect", "play"} {
			if a.cats[c] > 0 {
				p.Have++
			} else {
				p.Missing = append(p.Missing, c)
			}
		}
		out = append(out, p)
	}
	if !has["citizen"] {
		out = append(out, progress{ID: "citizen", Need: 1})
	}
	return out
}

// currentStreak: the run of consecutive active days ending on today or, if today has no activity
// yet, on yesterday; 0 when neither was active.
func currentStreak(days map[int]bool, today int) int {
	end := today
	if !days[end] {
		end--
	}
	n := 0
	for days[end-n] {
		n++
	}
	return n
}

// longestStreak: the longest run of consecutive day numbers.
func longestStreak(days map[int]bool) int {
	best := 0
	for d := range days {
		if days[d-1] {
			continue // not the start of a run
		}
		n := 1
		for days[d+n] {
			n++
		}
		best = max(best, n)
	}
	return best
}

// quantile returns the value at percent p (0–100) of vs, nearest rank; 0 for none.
func quantile(vs []float64, p int) float64 {
	if len(vs) == 0 {
		return 0
	}
	s := append([]float64(nil), vs...)
	sort.Float64s(s)
	i := (len(s)*p + 99) / 100
	return s[min(max(i-1, 0), len(s)-1)]
}
