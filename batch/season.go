package main

import (
	"sort"
	"strings"
)

// seasonStats is the whole chain's season for the /season page (GET /v1/{season}/season): totals,
// days and the most-used realms, nothing about any one address. (A realm path can still contain its
// deployer's address, as on any explorer.)
type seasonStats struct {
	Season    Season  `json:"season"`
	DataAsOf  string  `json:"dataAsOf"`
	Final     bool    `json:"final,omitempty"`
	Addresses int     `json:"addresses"`
	Txs       int     `json:"transactions"`
	Swaps     int     `json:"swaps"`
	GasGnot   float64 `json:"gasGnot"`
	Deployed  int     `json:"realmsDeployed"`
	Called    int     `json:"realmsCalled"`
	// per UTC day of the season, [0] = season.start
	DailyTxs      []int        `json:"dailyTxs"`
	DailyArrivals []int        `json:"dailyArrivals"` // addresses whose first tx was that day
	BusiestDay    *dayCount    `json:"busiestDay,omitempty"`
	TopRealms     []realmReach `json:"topRealms"`
}

type dayCount struct {
	Date string `json:"date"`
	Txs  int    `json:"txs"`
}

type realmReach struct {
	Path      string `json:"path"`
	Addresses int    `json:"addresses"` // distinct callers
	Calls     int    `json:"calls"`
}

const seasonTopRealms = 5

func (d *dataset) seasonStats(asOf string, final bool) seasonStats {
	s := seasonStats{Season: season, DataAsOf: asOf, Final: final, Addresses: len(d.accs), Txs: d.totalTxs,
		DailyTxs: make([]int, d.days), DailyArrivals: make([]int, d.days)}
	var gas int64
	deployed := map[string]bool{}
	reach := map[string]*realmReach{}
	for _, a := range d.accs {
		s.Swaps += a.swaps
		gas += a.gasUgnot
		for i, n := range a.daily {
			s.DailyTxs[i] += n
		}
		s.DailyArrivals[int(a.firstAt.Sub(d.start).Hours()/24)]++
		for _, p := range a.deployed {
			deployed[p] = true
		}
		for path, fns := range a.calls {
			r := reach[path]
			if r == nil {
				r = &realmReach{Path: path}
				reach[path] = r
			}
			r.Addresses++
			for _, n := range fns {
				r.Calls += n
			}
		}
	}
	s.GasGnot = roundGnot(gas)
	s.Deployed, s.Called = len(deployed), len(reach)
	for i, n := range s.DailyTxs {
		if n > 0 && (s.BusiestDay == nil || n > s.BusiestDay.Txs) {
			s.BusiestDay = &dayCount{Date: d.start.AddDate(0, 0, i).Format("2006-01-02"), Txs: n}
		}
	}
	s.TopRealms = []realmReach{}
	for _, r := range reach {
		s.TopRealms = append(s.TopRealms, *r)
	}
	sort.Slice(s.TopRealms, func(i, j int) bool {
		a, b := s.TopRealms[i], s.TopRealms[j]
		if a.Addresses != b.Addresses {
			return a.Addresses > b.Addresses
		}
		return strings.Compare(a.Path, b.Path) < 0
	})
	s.TopRealms = s.TopRealms[:min(seasonTopRealms, len(s.TopRealms))]
	return s
}
