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
	ID    string  `json:"id"`
	Value float64 `json:"value,omitempty"` // early: tier; streak: days; century: txs
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
)

type extras struct {
	arrival      map[string]arrival
	achievements map[string][]achievement
	milestones   map[string][]milestone
}

func (d *dataset) extras() extras {
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
