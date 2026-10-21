package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestTokenSymbolsAndPairs(t *testing.T) {
	for in, want := range map[string]string{
		"gno.land/r/gnoland/wugnot.wugnot":           "GNOT",
		"gno.land/r/gnoswap/gns.GNS":                 "GNS",
		"gno.land/r/" + testAddr + "/wbubble.BUBBLE": "BUBBLE",
		"no-symbol": "",
	} {
		if got := tokenSymbol(in); got != want {
			t.Errorf("tokenSymbol(%q) = %q, want %q", in, got, want)
		}
	}
	a := &acc{}
	a.trackSwapPair("gno.land/r/gnoswap/gns.GNS", "gno.land/r/gnoland/wugnot.wugnot") // GNS → GNOT
	a.trackSwapPair("gno.land/r/gnoland/wugnot.wugnot", "gno.land/r/gnoswap/gns.GNS") // GNOT → GNS: same pair
	a.trackSwapPair("gno.land/r/x/aaa.ZED", "gno.land/r/x/bbb.ABC")
	got := a.defiFor()
	if got == nil || got.TopPair == nil || *got.TopPair != (pairUsed{Tokens: [2]string{"GNOT", "GNS"}, Swaps: 2}) {
		t.Fatalf("top pair = %+v", got)
	}
	if (&acc{}).defiFor() != nil {
		t.Fatal("no GnoSwap activity should be no defi block")
	}
}

func TestTrackCountsGnoSwapAndGovernanceCalls(t *testing.T) {
	a := &acc{}
	for _, c := range [][2]string{
		{"gno.land/r/gnoswap/position", "Mint"}, {"gno.land/r/gnoswap/position", "IncreaseLiquidity"},
		{"gno.land/r/gnoswap/position", "DecreaseLiquidity"}, {"gno.land/r/gnoswap/position", "CollectFee"},
		{"gno.land/r/gnoswap/staker", "StakeToken"}, {"gno.land/r/gnoswap/staker", "CollectReward"},
		{"gno.land/r/gnoswap/gov/staker", "Delegate"},
		{"gno.land/r/gov/dao", "MustVoteOnProposalSimple"}, {"gno.land/r/gnoswap/gov/governance", "Vote"},
		{"gno.land/r/gnoswap/gov/governance", "ProposeParameterChange"}, {"gno.land/r/gov/dao", "ExecuteProposal"},
		{"gno.land/r/demo/boards", "Vote"}, // not governance
	} {
		a.track(c[0], c[1])
	}
	if a.defi != (defiStats{Positions: 1, LiquidityMoves: 2, FeesCollected: 1, Staked: 1, RewardsClaimed: 1}) {
		t.Errorf("defi = %+v", a.defi)
	}
	if a.gov != (govStats{Votes: 2, Proposals: 1, Delegations: 1}) {
		t.Errorf("gov = %+v", a.gov)
	}
}

func TestFailedTxsBuilderReportAndCitizen(t *testing.T) {
	start := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	d := &dataset{accs: map[string]*acc{}, failed: map[string]int{}, firstCall: map[string]map[string][2]int{}, deployer: map[string]string{},
		start: start, end: start.AddDate(0, 0, 111), weeks: 16, days: 111}
	d.st.GenesisTime, d.st.TipTime = start.Add(15*time.Hour), start.AddDate(0, 0, 40)
	other := "g1wrappedotherqqqqqqqqqqqqqqqqqqqqqqqqqq"
	realm := "gno.land/r/" + testAddr + "/hello"
	call := func(h int, who, pkg, fn string, ok bool) json.RawMessage {
		return json.RawMessage(fmt.Sprintf(`{"block_height":%d,"index":0,"hash":"h%d","success":%t,
			"messages":[{"value":{"__typename":"MsgCall","caller":%q,"pkg_path":%q,"func":%q}}]}`, h, h, ok, who, pkg, fn))
	}
	txs := []json.RawMessage{
		json.RawMessage(fmt.Sprintf(`{"block_height":10,"index":0,"hash":"h10","success":true,
			"messages":[{"value":{"__typename":"MsgAddPackage","creator":%q,"package":{"path":%q}}}]}`, testAddr, realm)),
		call(11, testAddr, realm, "Hi", true), // the deployer's own call doesn't count
		call(12, other, realm, "Hi", true),
		call(13, other, realm, "Hi", true),
		call(14, other, realm, "Hi", false), // failed: not a call, but a failed tx
		call(15, testAddr, "gno.land/r/gov/dao", "MustVoteOnProposalSimple", true),
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
	var shard map[string]wrapped
	json.Unmarshal(files["s1/"+shardKey(testAddr)+".json"], &shard)
	w := shard[testAddr]
	if len(w.Builder) != 1 || w.Builder[0] != (realmReport{Path: realm, Callers: 1, Calls: 2}) {
		t.Errorf("builder = %+v", w.Builder)
	}
	if shard[other].FailedTxs != 1 || shard[other].TxCount != 2 || w.FailedTxs != 0 {
		t.Errorf("failed: other %d/%d, owner %d", shard[other].FailedTxs, shard[other].TxCount, w.FailedTxs)
	}
	if w.Governance == nil || *w.Governance != (govStats{Votes: 1}) {
		t.Errorf("governance = %+v", w.Governance)
	}
	citizen := false
	for _, a := range w.Achievements {
		citizen = citizen || a.ID == "citizen"
	}
	if !citizen {
		t.Errorf("a GovDAO vote should earn Citizen: %+v", w.Achievements)
	}
	if r := redact(w); len(r.Builder) != 1 || strings.Contains(r.Builder[0].Path, testAddr) || r.Builder[0].Calls != 2 {
		t.Errorf("share view builder = %+v", r.Builder)
	}
}
