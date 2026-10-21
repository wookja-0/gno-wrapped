package main

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const testAddr = "g1wrappedtestqqqqqqqqqqqqqqqqqqqqqqqqqqq"

func TestRedactRemovesEveryAddressTrace(t *testing.T) {
	w := wrapped{
		Address: testAddr, ShareID: "abcdefghij12",
		FirstTx:        firstTx{Hash: "6rc/woCBRr4OkFdEhgfDEVYBPRYRa2uW9vOP4jbZ52g=", Date: "2026-10-05", MainnetDay: 25},
		TopRealms:      []realmStat{{Path: "gno.land/r/" + testAddr + "/hello", TopFunc: "Hi", Calls: 1}, {Path: "gno.land/r/gnoswap/router", TopFunc: "Swap", Calls: 2}},
		DeployedRealms: []string{"gno.land/r/" + testAddr + "/hello"},
		Persona:        personas["defi-pilot"],
		Arrival:        arrival{Order: 312, Of: 5029, Tier: 500},
	}
	r := redact(w)
	if r.Arrival.Order != 0 || r.Arrival.Tier != 500 || w.Arrival.Order != 312 {
		t.Errorf("arrival: shared %+v, owner %+v", r.Arrival, w.Arrival)
	}
	b, _ := json.Marshal(r)
	for _, leak := range []string{testAddr, testAddr[:6], testAddr[len(testAddr)-4:], w.FirstTx.Hash} {
		if strings.Contains(string(b), leak) {
			t.Errorf("redacted recap still contains %q: %s", leak, b)
		}
	}
	if !r.Shared || r.ShareID != "abcdefghij12" || r.TopRealms[1].Path != "gno.land/r/gnoswap/router" || r.DeployedRealms[0] != "gno.land/r/…/hello" {
		t.Errorf("unexpected redaction: %+v", r)
	}
	if w.TopRealms[0].Path == r.TopRealms[0].Path {
		t.Error("redact must not modify the owner's recap")
	}
}

func TestShareIDsAreStableAndUnique(t *testing.T) {
	c := config{DataDir: t.TempDir()}
	ids, err := loadShareIDs(c)
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for i := 0; i < 2000; i++ {
		id := ids.get(fmt.Sprintf("g1%038d", i))
		if len(id) != shareIDLen || strings.Trim(id, base36) != "" || seen[id] {
			t.Fatalf("bad or duplicate id %q", id)
		}
		seen[id] = true
		if strings.ToLower(id[:2]) != id[:2] {
			t.Fatalf("shard key %q is not lowercase", id[:2])
		}
	}
	first := ids.get(testAddr)
	if err := ids.save(); err != nil {
		t.Fatal(err)
	}
	again, _ := loadShareIDs(c)
	if again.get(testAddr) != first {
		t.Fatal("share id changed across reload")
	}
}

func TestReadChunksPrefersTheLongerLiveChunk(t *testing.T) {
	c := config{DataDir: t.TempDir()}
	t0 := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	tx := func(h int) json.RawMessage { return json.RawMessage(`{"block_height":` + itoa(h) + `}`) }
	for _, ch := range []chunk{
		{From: 1, To: 11, Txs: []json.RawMessage{tx(5)}, Blocks: []blockTime{{Height: 5, Time: t0}}},                                 // stale live file
		{From: 1, To: 21, Txs: []json.RawMessage{tx(5), tx(15)}, Blocks: []blockTime{{Height: 5, Time: t0}, {Height: 15, Time: t0}}}, // grown version
		{From: 21, To: 31, Txs: []json.RawMessage{tx(25)}, Blocks: []blockTime{{Height: 25, Time: t0}}},
	} {
		if err := writeChunk(c, ch); err != nil {
			t.Fatal(err)
		}
	}
	var got []string
	readChunks(c, func(ch chunk) error { got = append(got, itoa(ch.From)+"-"+itoa(ch.To)); return nil })
	if strings.Join(got, ",") != "1-21,21-31" {
		t.Fatalf("chunks read: %v", got)
	}
	got = nil
	readChunksFrom(c, 21, func(ch chunk) error { got = append(got, itoa(ch.From)); return nil })
	if strings.Join(got, ",") != "21" {
		t.Fatalf("chunks from 21: %v", got)
	}
}

func itoa(n int) string { b, _ := json.Marshal(n); return string(b) }

func TestPersonaRanks(t *testing.T) {
	t0 := time.Date(2026, 9, 12, 16, 0, 0, 0, time.UTC)
	mk := func(defi int, bot bool, at time.Time) *acc {
		return &acc{cats: map[string]int{"defi": defi}, calls: map[string]map[string]int{}, isBot: bot, firstAt: at}
	}
	accs := map[string]*acc{
		"a": mk(10, false, t0), "b": mk(30, false, t0), "c": mk(10, false, t0), "bot": mk(999, true, t0),
		"d1": mk(0, false, t0.Add(2*time.Hour)), "d2": mk(0, false, t0), "fs": mk(0, false, t0),
	}
	of := map[string]string{"a": "defi-pilot", "b": "defi-pilot", "c": "defi-pilot", "bot": "defi-pilot",
		"d1": "day-one-explorer", "d2": "day-one-explorer", "fs": "first-steps"}
	r := personaRanks(accs, of)
	want := map[string][2]int{"b": {1, 3}, "a": {2, 3}, "c": {2, 3}, "d2": {1, 2}, "d1": {2, 2}}
	for addr, w := range want {
		if r[addr] == nil || r[addr].Rank != w[0] || r[addr].Of != w[1] {
			t.Errorf("%s: got %+v, want rank %d of %d", addr, r[addr], w[0], w[1])
		}
	}
	if r["bot"] != nil || r["fs"] != nil {
		t.Errorf("bots and First Steps get no rank: bot=%+v fs=%+v", r["bot"], r["fs"])
	}
}

func TestStreakAndQuantile(t *testing.T) {
	if got := longestStreak(map[int]bool{1: true, 2: true, 3: true, 7: true, 8: true}); got != 3 {
		t.Errorf("streak = %d, want 3", got)
	}
	if got := longestStreak(map[int]bool{}); got != 0 {
		t.Errorf("empty streak = %d", got)
	}
	vs := []float64{5, 1, 4, 2, 3, 10, 9, 8, 7, 6}
	if q := quantile(vs, 10); q != 1 {
		t.Errorf("p10 = %v, want 1", q)
	}
	if q := quantile(vs, 90); q != 9 {
		t.Errorf("p90 = %v, want 9", q)
	}
}

func TestFinalOnceTheChainPassesTheSeasonEnd(t *testing.T) {
	end := time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC) // exclusive: the day after season.End
	d := &dataset{end: end}
	d.st.TipTime = end.Add(-time.Second)
	if final, asOf := d.final(); final || asOf != "2026-12-31" {
		t.Fatalf("one second before the end: final=%v asOf=%s", final, asOf)
	}
	d.st.TipTime = end.Add(72 * time.Hour)
	if final, asOf := d.final(); !final || asOf != season.End {
		t.Fatalf("after the end: final=%v asOf=%s, want true %s", final, asOf, season.End)
	}
}

func TestRedactKeepsOnlyActiveDaysPerWeek(t *testing.T) {
	daily := make([]int, 111)
	daily[0], daily[1], daily[6], daily[7], daily[110] = 3, 1, 9, 2, 1
	w := wrapped{Address: testAddr, Calendar: calendar{Daily: daily, ActiveDays: 5, LongestStreak: 2}}
	r := redact(w)
	if r.Calendar.Daily != nil {
		t.Fatal("share view must not carry the day-by-day series")
	}
	if len(r.Calendar.Weeks) != 16 || r.Calendar.Weeks[0] != 3 || r.Calendar.Weeks[1] != 1 || r.Calendar.Weeks[15] != 1 {
		t.Fatalf("weeks = %v", r.Calendar.Weeks)
	}
	if r.Calendar.ActiveDays != 5 || r.Calendar.LongestStreak != 2 || len(w.Calendar.Daily) != 111 {
		t.Fatalf("shared %+v / owner daily len %d", r.Calendar, len(w.Calendar.Daily))
	}
}

func TestPioneersSkipTheDeployerAndBotsAndQuietRealms(t *testing.T) {
	d := &dataset{accs: map[string]*acc{}, firstCall: map[string]map[string][2]int{}, deployer: map[string]string{}}
	addr := func(i int) string { return fmt.Sprintf("g1%038d", i) }
	busy, quiet := "gno.land/r/demo/busy", "gno.land/r/demo/quiet"
	d.firstCall[busy], d.firstCall[quiet] = map[string][2]int{}, map[string][2]int{}
	for i := 0; i < 62; i++ { // the deployer, a bot, then 60 others, in call order
		d.accs[addr(i)] = &acc{isBot: i == 1}
		d.firstCall[busy][addr(i)] = [2]int{100 + i, 0}
		if i < pioneerMinCallers { // 49 eligible callers: too few
			d.firstCall[quiet][addr(i)] = [2]int{100 + i, 1}
		}
	}
	d.deployer[busy], d.deployer[quiet] = addr(0), addr(0)

	p := pioneers(d.callers())
	if len(p) != pioneerSlots {
		t.Fatalf("%d pioneers, want %d", len(p), pioneerSlots)
	}
	for i := 2; i < 2+pioneerSlots; i++ {
		if got := p[addr(i)]; len(got) != 1 || got[0] != busy {
			t.Errorf("caller %d: %v, want [%s]", i, got, busy)
		}
	}
	for _, i := range []int{0, 1, 2 + pioneerSlots} { // deployer, bot, 11th eligible caller
		if p[addr(i)] != nil {
			t.Errorf("caller %d must not be a pioneer: %v", i, p[addr(i)])
		}
	}

	r := redact(wrapped{Address: testAddr, Achievements: []achievement{{ID: "pioneer", Value: 1, Realms: []string{busy}}}})
	if r.Achievements[0].Realms != nil || r.Achievements[0].Value != 1 {
		t.Fatalf("share view pioneer: %+v", r.Achievements[0])
	}
}

func TestSeasonStatsAddUpAndCarryNoAddress(t *testing.T) {
	start := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	daily := func(m map[int]int) []int {
		s := make([]int, 111)
		for i, n := range m {
			s[i] = n
		}
		return s
	}
	d := &dataset{start: start, days: 111, totalTxs: 9, accs: map[string]*acc{
		testAddr: {firstAt: start.Add(30 * time.Hour), daily: daily(map[int]int{1: 2, 5: 4}), swaps: 3, gasUgnot: 1_500_000,
			calls: map[string]map[string]int{"gno.land/r/gnoswap/router": {"Swap": 3}, "gno.land/r/demo/boards": {"Post": 1}}, deployed: []string{"gno.land/r/" + testAddr + "/hi"}},
		"g1wrappedotherqqqqqqqqqqqqqqqqqqqqqqqqqq": {firstAt: start.Add(5 * 24 * time.Hour), daily: daily(map[int]int{5: 3}),
			calls: map[string]map[string]int{"gno.land/r/gnoswap/router": {"Swap": 2}}},
	}}
	s := d.seasonStats("2026-10-20", false)
	if s.Addresses != 2 || s.Txs != 9 || s.Swaps != 3 || s.GasGnot != 1.5 || s.Deployed != 1 || s.Called != 2 {
		t.Fatalf("totals: %+v", s)
	}
	if s.DailyTxs[1] != 2 || s.DailyTxs[5] != 7 || s.DailyArrivals[1] != 1 || s.DailyArrivals[5] != 1 {
		t.Fatalf("days: txs %v arrivals %v", s.DailyTxs[:6], s.DailyArrivals[:6])
	}
	if s.BusiestDay == nil || *s.BusiestDay != (dayCount{"2026-09-17", 7}) {
		t.Fatalf("busiest day %+v", s.BusiestDay)
	}
	if len(s.TopRealms) != 2 || s.TopRealms[0] != (realmReach{"gno.land/r/gnoswap/router", 2, 5}) {
		t.Fatalf("top realms %+v", s.TopRealms)
	}
	if b, _ := json.Marshal(s); strings.Contains(string(b), "g1wrapped") {
		t.Fatalf("season stats name an address: %s", b)
	}
}

func TestDayListKeepsTheFirstTxsOfEachDayForTheOwnerOnly(t *testing.T) {
	start := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	d := &dataset{accs: map[string]*acc{}, firstCall: map[string]map[string][2]int{}, deployer: map[string]string{},
		start: start, end: start.AddDate(0, 0, 111), weeks: 16, days: 111}
	d.st.GenesisTime = start.Add(15 * time.Hour)
	d.st.TipTime = start.AddDate(0, 0, 40)
	var txs []json.RawMessage
	var blocks []blockTime
	for i := 0; i < dayTxCap+2; i++ { // two more calls than the cap on Oct 1, one per block
		h := 1000 + i
		txs = append(txs, json.RawMessage(fmt.Sprintf(`{"block_height":%d,"index":0,"hash":"hash%02d","success":true,
			"messages":[{"value":{"__typename":"MsgCall","caller":%q,"pkg_path":"gno.land/r/demo/boards","func":"Post"}},
			            {"value":{"__typename":"MsgCall","caller":%q,"pkg_path":"gno.land/r/demo/boards","func":"Vote"}}]}`, h, i, testAddr, testAddr)))
		blocks = append(blocks, blockTime{Height: h, Time: start.AddDate(0, 0, 19).Add(time.Duration(i) * time.Minute), NumTxs: 1})
	}
	txs = append(txs, json.RawMessage(fmt.Sprintf(`{"block_height":5000,"index":0,"hash":"send1","success":true,
		"messages":[{"value":{"__typename":"BankMsgSend","from_address":%q}}]}`, testAddr)))
	blocks = append(blocks, blockTime{Height: 5000, Time: start.AddDate(0, 0, 20).Add(9*time.Hour + 5*time.Minute), NumTxs: 1})
	if err := d.applyChunk(chunk{From: 1, To: 5001, Txs: txs, Blocks: blocks}); err != nil {
		t.Fatal(err)
	}

	ids, _ := loadShareIDs(config{DataDir: t.TempDir()})
	files, err := d.render(ids, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	var days map[string]map[string][]dayTx
	if err := json.Unmarshal(files[filepath.Join("s1", "days", shardKey(testAddr)+".json")], &days); err != nil {
		t.Fatal(err)
	}
	oct1, oct2 := days[testAddr]["2026-10-01"], days[testAddr]["2026-10-02"]
	if len(oct1) != dayTxCap || oct1[0] != (dayTx{Hash: "hash00", Time: "00:00", Kind: "call", Path: "gno.land/r/demo/boards", Func: "Post", Msgs: 2}) || oct1[dayTxCap-1].Hash != fmt.Sprintf("hash%02d", dayTxCap-1) {
		t.Fatalf("Oct 1: %d txs, first %+v, last %+v", len(oct1), oct1[0], oct1[len(oct1)-1])
	}
	if len(oct2) != 1 || oct2[0] != (dayTx{Hash: "send1", Time: "09:05", Kind: "send"}) {
		t.Fatalf("Oct 2: %+v", oct2)
	}
	for name, b := range files {
		if strings.Contains(name, "share") && strings.Contains(string(b), "hash00") {
			t.Fatalf("%s carries a tx hash", name)
		}
	}
}

func TestHoursAndProgressAreForTheOwnerWhileTheSeasonIsLive(t *testing.T) {
	start := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	d := &dataset{accs: map[string]*acc{}, firstCall: map[string]map[string][2]int{}, deployer: map[string]string{},
		start: start, end: start.AddDate(0, 0, 111), weeks: 16, days: 111}
	d.st.GenesisTime = start.Add(15 * time.Hour)
	d.st.TipTime = start.AddDate(0, 0, 40).Add(3 * time.Hour) // day 40, nothing yet today
	var txs []json.RawMessage
	var blocks []blockTime
	add := func(h int, at time.Time, pkg string) {
		txs = append(txs, json.RawMessage(fmt.Sprintf(`{"block_height":%d,"index":0,"hash":"h%d","success":true,
			"messages":[{"value":{"__typename":"MsgCall","caller":%q,"pkg_path":%q,"func":"Do"}}]}`, h, h, testAddr, pkg)))
		blocks = append(blocks, blockTime{Height: h, Time: at, NumTxs: 1})
	}
	add(10, start.AddDate(0, 0, 30).Add(23*time.Hour), "gno.land/r/gnoswap/router") // a lone day, long ago
	add(11, start.AddDate(0, 0, 38).Add(23*time.Hour+30*time.Minute), "gno.land/r/demo/boards")
	add(12, start.AddDate(0, 0, 39).Add(2*time.Hour), "gno.land/r/demo/boards") // days 38–39: a run of 2 up to yesterday
	if err := d.applyChunk(chunk{From: 1, To: 13, Txs: txs, Blocks: blocks}); err != nil {
		t.Fatal(err)
	}
	owner := func() wrapped {
		ids, _ := loadShareIDs(config{DataDir: t.TempDir()})
		files, err := d.render(ids, time.Now())
		if err != nil {
			t.Fatal(err)
		}
		var shard map[string]wrapped
		json.Unmarshal(files["s1/"+shardKey(testAddr)+".json"], &shard)
		return shard[testAddr]
	}
	w := owner()
	if len(w.Hours) != 24 || w.Hours[23] != 2 || w.Hours[2] != 1 {
		t.Errorf("hours = %v", w.Hours)
	}
	want := []string{"century 3/100 []", "streak 2/3 []", "triple-threat 1/3 [collect play]", "citizen 0/1 []"}
	var got []string
	for _, p := range w.Progress {
		got = append(got, fmt.Sprintf("%s %d/%d %v", p.ID, p.Have, p.Need, p.Missing))
	}
	if strings.Join(got, ", ") != strings.Join(want, ", ") {
		t.Errorf("progress = %v, want %v", got, want)
	}
	if r := redact(w); r.Hours != nil || r.Progress != nil {
		t.Errorf("share view: hours %v, progress %v", r.Hours, r.Progress)
	}

	d.st.TipTime = start.AddDate(0, 0, 42) // two quiet days: the run is over
	if p := owner().Progress; p[1].ID != "streak" || p[1].Have != 0 {
		t.Errorf("after a gap: %+v", p[1])
	}
	d.st.TipTime = d.end.Add(time.Hour)
	if w := owner(); w.Progress != nil || len(w.Hours) != 24 {
		t.Errorf("final season: progress %v, hours %v", w.Progress, w.Hours)
	}
}

func TestCurrentStreak(t *testing.T) {
	days := map[int]bool{3: true, 4: true, 5: true, 8: true}
	for today, want := range map[int]int{5: 3, 6: 3, 7: 0, 8: 1, 9: 1, 10: 0} {
		if got := currentStreak(days, today); got != want {
			t.Errorf("today %d: %d, want %d", today, got, want)
		}
	}
}

func TestTopRealmsCarryTheCallerOrderForTheOwnerOnly(t *testing.T) {
	start := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	d := &dataset{accs: map[string]*acc{}, firstCall: map[string]map[string][2]int{}, deployer: map[string]string{},
		start: start, end: start.AddDate(0, 0, 111), weeks: 16, days: 111}
	d.st.GenesisTime, d.st.TipTime = start.Add(15*time.Hour), start.AddDate(0, 0, 40)
	addr := func(i int) string { return fmt.Sprintf("g1wrapped%031d", i) }
	realm := "gno.land/r/demo/boards"
	tx := func(h int, msg string) json.RawMessage {
		return json.RawMessage(fmt.Sprintf(`{"block_height":%d,"index":0,"hash":"h%d","success":true,"messages":[{"value":%s}]}`, h, h, msg))
	}
	call := func(h int, who string) json.RawMessage {
		return tx(h, fmt.Sprintf(`{"__typename":"MsgCall","caller":%q,"pkg_path":%q,"func":"Post"}`, who, realm))
	}
	txs := []json.RawMessage{
		tx(10, fmt.Sprintf(`{"__typename":"MsgAddPackage","creator":%q,"package":{"path":%q}}`, addr(0), realm)),
		call(11, addr(0)), // the deployer: no place in the order
		call(12, addr(2)),
		call(13, addr(1)),
		call(14, addr(2)), // a second call doesn't move anyone
		call(15, addr(3)),
	}
	var blocks []blockTime
	for h := 10; h <= 15; h++ {
		blocks = append(blocks, blockTime{Height: h, Time: start.AddDate(0, 0, 20), NumTxs: 1})
	}
	if err := d.applyChunk(chunk{From: 1, To: 16, Txs: txs, Blocks: blocks}); err != nil {
		t.Fatal(err)
	}
	ids, _ := loadShareIDs(config{DataDir: t.TempDir()})
	files, err := d.render(ids, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	recap := func(i int) wrapped {
		var shard map[string]wrapped
		json.Unmarshal(files["s1/"+shardKey(addr(i))+".json"], &shard)
		return shard[addr(i)]
	}
	for i, want := range map[int]int{0: 0, 1: 2, 2: 1, 3: 3} {
		if r := recap(i).TopRealms[0]; r.Order != want || r.Callers != 3 {
			t.Errorf("caller %d: order %d of %d, want %d of 3", i, r.Order, r.Callers, want)
		}
	}
	if r := redact(recap(2)).TopRealms[0]; r.Order != 0 || r.Callers != 3 {
		t.Errorf("share view: %+v", r)
	}
}
