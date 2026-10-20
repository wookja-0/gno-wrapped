package main

import (
	"context"
	"fmt"
	"log"
)

// verify checks the raw cache against the chain: every chunk must hold exactly the txs the chain
// counts for its heights (the difference of total_txs at its ends), and chunks must cover every
// height below the fetch cursor with no gap. A chunk that doesn't add up is fetched again.
// Cost: one small request per 25 chunks, plus a range query per repaired chunk.
func verify(ctx context.Context, c config) (repaired int, err error) {
	st, err := loadState(c)
	if err != nil {
		return 0, err
	}
	type span struct{ from, to, txs int }
	var spans []span
	if err := readChunks(c, func(ch chunk) error {
		spans = append(spans, span{ch.From, ch.To, len(ch.Txs)})
		return nil
	}); err != nil {
		return 0, err
	}
	// gaps between chunks (and between the last chunk and the cursor) count as empty chunks
	var all []span
	next := 1
	for _, s := range spans {
		if s.from > next {
			all = append(all, span{next, s.from, 0})
		}
		all = append(all, s)
		next = max(next, s.to)
	}
	if st.FetchedTo > next {
		all = append(all, span{next, st.FetchedTo, 0})
	}

	ix := newIndexer(c)
	var heights []int
	for _, s := range all {
		heights = append(heights, s.from-1, s.to-1)
	}
	total, err := ix.totalTxsAt(ctx, heights)
	if err != nil {
		return 0, fmt.Errorf("chain tx counts: %w", err)
	}
	for _, s := range all {
		want := total[s.to-1] - total[s.from-1]
		if s.txs == want {
			continue
		}
		log.Printf("verify: heights %d-%d have %d txs cached, the chain has %d; fetching again", s.from, s.to, s.txs, want)
		ch, err := fetchChunk(ctx, ix, s.from, s.to)
		if err != nil {
			return repaired, err
		}
		if err := writeChunk(c, ch); err != nil {
			return repaired, err
		}
		repaired++
	}
	log.Printf("verify: %d chunks checked against the chain, %d repaired", len(all), repaired)
	return repaired, nil
}

// cacheMatchesChain compares the dataset's tx count with the chain's at the last cached height.
func (d *dataset) cacheMatchesChain(ctx context.Context, c config) (bool, error) {
	h := d.st.FetchedTo - 1
	total, err := newIndexer(c).totalTxsAt(ctx, []int{h})
	if err != nil {
		return false, err
	}
	if d.rawTxs != total[h] {
		log.Printf("live: %d txs cached through height %d, the chain has %d", d.rawTxs, h, total[h])
		return false, nil
	}
	return true, nil
}
