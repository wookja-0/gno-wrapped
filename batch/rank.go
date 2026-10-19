package main

import "sort"

// Persona rank: where an address stands among others with the same persona, shown to that address
// only (there is no public list). Bots are left out of the ranking and get no rank.

type personaRank struct {
	Rank   int     `json:"rank"`   // 1 = best; ties share a rank
	Of     int     `json:"of"`     // ranked (non-bot) addresses with this persona
	Metric string  `json:"metric"` // what it's ranked by; see rankMetric
	Value  float64 `json:"value"`
}

// rankMetric returns what a persona is ranked by and the address's value; ok=false for personas
// without a rank (First Steps: everyone made one or two transfers).
func rankMetric(personaID string, a *acc) (metric string, value float64, higherIsBetter, ok bool) {
	switch personaID {
	case "builder":
		return "deployed", float64(len(a.deployed)), true, true
	case "day-one-explorer":
		return "firstTx", float64(a.firstAt.Unix()), false, true // earlier is better
	case "realm-hopper":
		return "realms", float64(len(a.calls)), true, true
	case "defi-pilot":
		return "defi", float64(a.cats["defi"]), true, true
	case "collector":
		return "collect", float64(a.cats["collect"]), true, true
	case "player-one":
		return "play", float64(a.cats["play"]), true, true
	case "gnot-courier":
		return "transfer", float64(a.cats["transfer"]), true, true
	}
	return "", 0, false, false
}

// personaRanks ranks every non-bot address within its persona: rank = 1 + how many ranked addresses
// of the same persona did strictly better.
func personaRanks(accs map[string]*acc, personaOf map[string]string) map[string]*personaRank {
	type entry struct {
		addr  string
		value float64
	}
	groups := map[string][]entry{}
	better := map[string]bool{}
	for addr, a := range accs {
		id := personaOf[addr]
		_, v, hib, ok := rankMetric(id, a)
		if !ok || a.isBot {
			continue
		}
		if !hib {
			v = -v // rank lower-is-better metrics with the same "higher wins" code
		}
		groups[id] = append(groups[id], entry{addr, v})
		better[id] = hib
	}
	out := map[string]*personaRank{}
	for id, es := range groups {
		sort.Slice(es, func(i, j int) bool { return es[i].value > es[j].value })
		for i, e := range es {
			rank := i + 1
			if i > 0 && es[i-1].value == e.value {
				rank = out[es[i-1].addr].Rank // tie: same rank as the previous one
			}
			metric, v, _, _ := rankMetric(id, accs[e.addr])
			out[e.addr] = &personaRank{Rank: rank, Of: len(es), Metric: metric, Value: v}
		}
	}
	return out
}
