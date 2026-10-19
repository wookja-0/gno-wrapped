package main

import (
	"encoding/json"
	"fmt"
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
		{From: 1, To: 11, Txs: []json.RawMessage{tx(5)}, Blocks: []blockTime{{5, t0}}},                   // stale live file
		{From: 1, To: 21, Txs: []json.RawMessage{tx(5), tx(15)}, Blocks: []blockTime{{5, t0}, {15, t0}}}, // grown version
		{From: 21, To: 31, Txs: []json.RawMessage{tx(25)}, Blocks: []blockTime{{25, t0}}},
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
