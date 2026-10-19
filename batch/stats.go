package main

import (
	"fmt"
	"sort"
)

// stats prints distributions from the local cache to tune personaRules and
// the web app's gas tiers. It never calls the indexer.
func stats(c config) error {
	d, err := loadDataset(c)
	if err != nil {
		return err
	}
	var txs, gas []float64
	personas := map[string]int{}
	bots := 0
	for _, a := range d.accs {
		txs = append(txs, float64(a.txs))
		gas = append(gas, float64(a.gasUgnot)/1e6)
		personas[choosePersona(a, d.mainnetDay(a.firstAt)).ID]++
		if a.isBot {
			bots++
		}
	}
	fmt.Printf("season %s: %d addresses, %d successful txs, data to height %d\n",
		season.ID, len(d.accs), d.totalTxs, d.st.FetchedTo-1)
	printQuantiles("txs per address", txs)
	printQuantiles("gas per address (GNOT)", gas)

	fmt.Printf("\nbots (>=%d txs and (>=%.0f%% one action or >=%.0f txs/day)): %d\n",
		personaRules.BotMinTxs, personaRules.BotMinTopActionPct*100, personaRules.BotMinTxsPerDay, bots)
	type top struct {
		addr string
		a    *acc
	}
	var heavy []top
	for addr, a := range d.accs {
		heavy = append(heavy, top{addr, a})
	}
	sort.Slice(heavy, func(i, j int) bool { return heavy[i].a.txs > heavy[j].a.txs })
	fmt.Println("top 15 addresses by txs:")
	for _, h := range heavy[:min(15, len(heavy))] {
		r := topRealms(h.a, 1)
		where := "-"
		if len(r) > 0 {
			where = r[0].Path + " · " + r[0].TopFunc
		}
		fmt.Printf("  %s  %6d txs  %6.1f/day  top-action %3.0f%%  bot=%-5v  %s\n", h.addr, h.a.txs, h.a.perDay, h.a.topActPct*100, h.a.isBot, where)
	}

	firstDay := map[int]int{}
	for _, a := range d.accs {
		firstDay[d.mainnetDay(a.firstAt)]++
	}
	fmt.Print("\naddresses by first-tx mainnet day (cumulative):")
	cum := 0
	for day := 1; day <= 14; day++ {
		cum += firstDay[day]
		fmt.Printf(" d%d=%d", day, cum)
	}
	fmt.Println()

	fmt.Println("\npersonas:")
	for _, id := range personaOrder {
		fmt.Printf("  %-17s %6d  (%.1f%%)\n", id, personas[id], float64(personas[id])*100/float64(max(1, len(d.accs))))
	}
	return nil
}

func printQuantiles(name string, v []float64) {
	if len(v) == 0 {
		return
	}
	sort.Float64s(v)
	q := func(p float64) float64 { return v[int(p*float64(len(v)-1))] }
	fmt.Printf("\n%s: p10 %.4g · p25 %.4g · p50 %.4g · p75 %.4g · p90 %.4g · p95 %.4g · p99 %.4g · max %.4g\n",
		name, q(.10), q(.25), q(.50), q(.75), q(.90), q(.95), q(.99), v[len(v)-1])
}
