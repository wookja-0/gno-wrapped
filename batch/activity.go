package main

import (
	"regexp"
	"sort"
	"strings"
)

// GnoSwap and governance detail beyond the persona categories, and the builder's report: how much
// the realms an address deployed got used.

// defiStats: GnoSwap beyond swaps (counted per call, from the realms GnoSwap deploys on gnoland-1).
type defiStats struct {
	Positions      int       `json:"positions,omitempty"`      // position.Mint: liquidity positions opened
	LiquidityMoves int       `json:"liquidityMoves,omitempty"` // position.IncreaseLiquidity / DecreaseLiquidity
	FeesCollected  int       `json:"feesCollected,omitempty"`  // position.CollectFee
	Staked         int       `json:"staked,omitempty"`         // staker.StakeToken
	RewardsClaimed int       `json:"rewardsClaimed,omitempty"` // staker.CollectReward
	TopPair        *pairUsed `json:"topPair,omitempty"`        // most-swapped pair, either direction
}

type pairUsed struct {
	Tokens [2]string `json:"tokens"` // symbols, GNOT first when it's one of them
	Swaps  int       `json:"swaps"`
}

// govStats: votes and proposals on gno.land's GovDAO and GnoSwap governance, and GNS delegations.
type govStats struct {
	Votes       int `json:"votes,omitempty"`
	Proposals   int `json:"proposals,omitempty"`
	Delegations int `json:"delegations,omitempty"` // gov/staker.Delegate (GNS → xGNS)
}

func govOrNil(g govStats) *govStats {
	if g == (govStats{}) {
		return nil
	}
	return &g
}

// realmReport: one realm the address deployed, and its use by everyone else.
type realmReport struct {
	Path    string `json:"path"`
	Callers int    `json:"callers"` // distinct addresses, the deployer not counted
	Calls   int    `json:"calls"`   // their calls in total
}

var (
	govRealm  = regexp.MustCompile(`^gno\.land/r/(gov/dao|gnoswap/gov/governance)(/|$)`)
	voteFunc  = regexp.MustCompile(`(?i)vote`)
	proposeFn = regexp.MustCompile(`(?i)^propose|createproposal`)
)

// track records one successful MsgCall's GnoSwap and governance detail.
func (a *acc) track(pkgPath, fn string) {
	switch pkgPath {
	case "gno.land/r/gnoswap/position":
		switch fn {
		case "Mint":
			a.defi.Positions++
		case "IncreaseLiquidity", "DecreaseLiquidity":
			a.defi.LiquidityMoves++
		case "CollectFee":
			a.defi.FeesCollected++
		}
	case "gno.land/r/gnoswap/staker":
		switch fn {
		case "StakeToken":
			a.defi.Staked++
		case "CollectReward":
			a.defi.RewardsClaimed++
		}
	case "gno.land/r/gnoswap/gov/staker":
		if fn == "Delegate" {
			a.gov.Delegations++
		}
	}
	if govRealm.MatchString(pkgPath) {
		switch {
		case voteFunc.MatchString(fn):
			a.gov.Votes++
		case proposeFn.MatchString(fn):
			a.gov.Proposals++
		}
	}
}

// trackSwapPair records the token pair of a GnoSwap router swap event (input/output token paths).
func (a *acc) trackSwapPair(in, out string) {
	x, y := tokenSymbol(in), tokenSymbol(out)
	if x == "" || y == "" {
		return
	}
	if y == "GNOT" || (x != "GNOT" && y < x) {
		x, y = y, x
	}
	if a.pairs == nil {
		a.pairs = map[[2]string]int{}
	}
	a.pairs[[2]string{x, y}]++
}

// tokenSymbol: "gno.land/r/gnoswap/gns.GNS" → "GNS"; wrapped GNOT reads as GNOT.
func tokenSymbol(path string) string {
	if path == "gno.land/r/gnoland/wugnot.wugnot" || path == "gnot" || path == "ugnot" {
		return "GNOT"
	}
	i := strings.LastIndex(path, ".")
	if i < 0 || i == len(path)-1 {
		return ""
	}
	return strings.ToUpper(path[i+1:])
}

// defiFor fills in the most-swapped pair; nil when the address did none of it.
func (a *acc) defiFor() *defiStats {
	s := a.defi
	for pair, n := range a.pairs {
		if s.TopPair == nil || n > s.TopPair.Swaps || (n == s.TopPair.Swaps && pair[0]+pair[1] < s.TopPair.Tokens[0]+s.TopPair.Tokens[1]) {
			s.TopPair = &pairUsed{Tokens: pair, Swaps: n}
		}
	}
	if s == (defiStats{}) {
		return nil
	}
	return &s
}

// realmReports: for every realm anyone deployed, how many other addresses called it, how often.
func (d *dataset) realmReports() map[string]realmReport {
	out := map[string]realmReport{}
	for addr, a := range d.accs {
		for path, fns := range a.calls {
			dep, ok := d.deployer[path]
			if !ok || addr == dep {
				continue
			}
			r := out[path]
			r.Path = path
			r.Callers++
			for _, n := range fns {
				r.Calls += n
			}
			out[path] = r
		}
	}
	return out
}

// builderReport: the address's deployed realms, most-called first.
func builderReport(deployed []string, reports map[string]realmReport) []realmReport {
	if len(deployed) == 0 {
		return nil
	}
	out := make([]realmReport, 0, len(deployed))
	for _, p := range deployed {
		r := reports[p]
		r.Path = p
		out = append(out, r)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Calls > out[j].Calls })
	return out
}
