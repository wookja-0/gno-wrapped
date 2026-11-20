package main

import "sort"

// Per-persona stats for /personas/<id> (in personas.json): how the addresses with a persona used the
// season, as aggregates only. Bots are left out, as from ranks. Anything counted over fewer than
// minGroup addresses is left out or marked "few", so a small persona (31 Builders) can't single
// anyone out through a rare realm or achievement.

const (
	minGroup       = 5
	statsTopRealms = 5
)

type personaStats struct {
	Addresses    int            `json:"addresses"`              // non-bot addresses with the persona
	MedianTxs    int            `json:"medianTxs"`              // successful txs this season
	MedianDays   int            `json:"medianDays"`             // active UTC days
	Hours        []int          `json:"hours"`                  // txs per UTC hour, summed over them
	TopRealms    []realmReach   `json:"topRealms,omitempty"`    // most-called by them, each by minGroup+ of them
	Achievements map[string]int `json:"achievements,omitempty"` // how many of them hold each, minGroup+ only
	Rank         *rankSpread    `json:"rank,omitempty"`         // how the ranking metric spreads (count metrics)
}

// rankSpread: the ranking metric in buckets, and the value the top 10% reach.
type rankSpread struct {
	Top10   int          `json:"top10"`
	Buckets []rankBucket `json:"buckets"`
}

type rankBucket struct {
	From  int  `json:"from"`
	To    int  `json:"to,omitempty"` // inclusive; 0 = and up
	Count int  `json:"count"`
	Few   bool `json:"few,omitempty"` // 1 to minGroup-1 addresses: the count is withheld
}

var rankEdges = []int{1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000}

func (d *dataset) personaStats(personaOf map[string]string, achievements map[string][]achievement) map[string]*personaStats {
	type group struct {
		txs, days, metric []int
		hours             [24]int
		realms            map[string]map[string]bool // realm → callers
		ach               map[string]int
	}
	groups := map[string]*group{}
	for addr, a := range d.accs {
		if a.isBot {
			continue
		}
		id := personaOf[addr]
		g := groups[id]
		if g == nil {
			g = &group{realms: map[string]map[string]bool{}, ach: map[string]int{}}
			groups[id] = g
		}
		g.txs = append(g.txs, a.txs)
		g.days = append(g.days, len(a.days))
		for h, n := range a.hours {
			g.hours[h] += n
		}
		for path := range a.calls {
			if g.realms[path] == nil {
				g.realms[path] = map[string]bool{}
			}
			g.realms[path][addr] = true
		}
		for _, x := range achievements[addr] {
			g.ach[x.ID]++
		}
		if m, v, _, ok := rankMetric(id, a); ok && m != "firstTx" { // a timestamp has no useful spread
			g.metric = append(g.metric, int(v))
		}
	}

	out := map[string]*personaStats{}
	for id, g := range groups {
		s := &personaStats{Addresses: len(g.txs), MedianTxs: median(g.txs), MedianDays: median(g.days), Hours: g.hours[:]}
		var realms []realmReach
		for path, who := range g.realms {
			if len(who) >= minGroup {
				realms = append(realms, realmReach{Path: path, Addresses: len(who)})
			}
		}
		sort.Slice(realms, func(i, j int) bool {
			if realms[i].Addresses != realms[j].Addresses {
				return realms[i].Addresses > realms[j].Addresses
			}
			return realms[i].Path < realms[j].Path
		})
		s.TopRealms = realms[:min(statsTopRealms, len(realms))]
		for x, n := range g.ach {
			if n >= minGroup {
				if s.Achievements == nil {
					s.Achievements = map[string]int{}
				}
				s.Achievements[x] = n
			}
		}
		if len(g.metric) > 0 {
			s.Rank = spread(g.metric)
		}
		out[id] = s
	}
	return out
}

func median(vs []int) int {
	if len(vs) == 0 {
		return 0
	}
	s := append([]int(nil), vs...)
	sort.Ints(s)
	return s[len(s)/2]
}

// spread buckets the values by rankEdges (empty buckets dropped) and finds the top 10%'s threshold:
// the value of the address at the 10% mark, counting from the top.
func spread(vs []int) *rankSpread {
	s := append([]int(nil), vs...)
	sort.Sort(sort.Reverse(sort.IntSlice(s)))
	r := &rankSpread{Top10: s[max(0, (len(s)+9)/10-1)]}
	for i, from := range rankEdges {
		to := 0
		if i+1 < len(rankEdges) {
			to = rankEdges[i+1] - 1
		}
		n := 0
		for _, v := range s {
			if v >= from && (to == 0 || v <= to) {
				n++
			}
		}
		switch {
		case n == 0:
			continue
		case n < minGroup:
			r.Buckets = append(r.Buckets, rankBucket{From: from, To: to, Few: true})
		default:
			r.Buckets = append(r.Buckets, rankBucket{From: from, To: to, Count: n})
		}
	}
	return r
}
