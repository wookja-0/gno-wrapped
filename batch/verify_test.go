package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeIndexer answers the GraphQL queries the batch sends, for a chain of `tip` blocks where
// block h has numTxs[h] txs. hide, while > 0, drops the last tx of each range query (as an
// indexer does when it has stored a block but not yet all of its txs), counting down per query.
type fakeIndexer struct {
	mu     sync.Mutex
	tip    int
	numTxs map[int]int
	hide   int
	t0     time.Time
}

var rangeRE = regexp.MustCompile(`(\w+: )?get(Transactions|Blocks)\(where:\{(?:block_)?height:\{gt:(-?\d+),lt:(\d+)\}`)

func removeChunk(c config, ch chunk) error {
	return os.Remove(filepath.Join(rawDir(c), "chunks", fmt.Sprintf("%010d-%010d.json.gz", ch.From, ch.To)))
}

func (f *fakeIndexer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var req struct{ Query string }
	_ = json.NewDecoder(r.Body).Decode(&req)
	data := map[string]any{}
	if strings.Contains(req.Query, "latestBlockHeight") {
		data["latestBlockHeight"] = f.tip
	}
	if strings.Contains(req.Query, "height:{eq:1}") { // genesis time
		data["getBlocks"] = []map[string]any{{"height": 1, "time": f.t0}}
	}
	for _, m := range rangeRE.FindAllStringSubmatch(req.Query, -1) {
		alias, kind := strings.TrimSuffix(m[1], ": "), m[2]
		gt, _ := strconv.Atoi(m[3])
		lt, _ := strconv.Atoi(m[4])
		switch {
		case kind == "Transactions":
			var txs []map[string]any
			for h := gt + 1; h < lt && h <= f.tip; h++ {
				for i := 0; i < f.numTxs[h]; i++ {
					txs = append(txs, map[string]any{"block_height": h, "index": i, "hash": fmt.Sprintf("h%d-%d", h, i), "success": true})
				}
			}
			if f.hide > 0 && len(txs) > 0 {
				txs, f.hide = txs[:len(txs)-1], f.hide-1
			}
			data["getTransactions"] = txs
		case alias != "": // total_txs lookup
			total := 0
			for h := 1; h <= gt+1; h++ {
				total += f.numTxs[h]
			}
			data[alias] = []map[string]any{{"height": gt + 1, "total_txs": total}}
		default: // block times
			var bs []map[string]any
			for h := gt + 1; h < lt && h <= f.tip; h++ {
				if f.numTxs[h] > 0 {
					bs = append(bs, map[string]any{"height": h, "time": f.t0.Add(time.Duration(h) * time.Second), "num_txs": f.numTxs[h]})
				}
			}
			data["getBlocks"] = bs
		}
	}
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func newFakeIndexer(t *testing.T) (*fakeIndexer, config) {
	t.Helper()
	incompleteWait = time.Millisecond
	f := &fakeIndexer{tip: 30, numTxs: map[int]int{3: 2, 9: 1, 15: 3, 22: 1, 28: 2}, t0: time.Date(2026, 9, 12, 15, 0, 0, 0, time.UTC)}
	srv := httptest.NewServer(f)
	t.Cleanup(srv.Close)
	return f, config{IndexerURL: srv.URL, DataDir: t.TempDir(), ChunkBlocks: 10}
}

func cachedTxs(t *testing.T, c config) int {
	t.Helper()
	n := 0
	if err := readChunks(c, func(ch chunk) error { n += len(ch.Txs); return nil }); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestFetchRetriesARangeThatComesBackIncomplete(t *testing.T) {
	f, c := newFakeIndexer(t)
	f.hide = 2 // the first two answers miss a tx; the third is complete
	if err := fetch(context.Background(), c); err != nil {
		t.Fatal(err)
	}
	if got := cachedTxs(t, c); got != 9 {
		t.Fatalf("cached %d txs, the chain has 9", got)
	}
}

func TestFetchFailsInsteadOfCachingAGap(t *testing.T) {
	f, c := newFakeIndexer(t)
	f.hide = 1000 // never complete
	err := fetch(context.Background(), c)
	if err == nil || !strings.Contains(err.Error(), errIncomplete.Error()) {
		t.Fatalf("want errIncomplete, got %v", err)
	}
	if st, _ := loadState(c); st.FetchedTo != 1 {
		t.Fatalf("cursor moved past an incomplete range: fetchedTo=%d", st.FetchedTo)
	}
}

func TestVerifyRepairsMissingTxsAndGaps(t *testing.T) {
	_, c := newFakeIndexer(t)
	if err := fetch(context.Background(), c); err != nil {
		t.Fatal(err)
	}
	// damage the cache the way an old batch could: a chunk short one tx, and a lost chunk
	var chunks []chunk
	readChunks(c, func(ch chunk) error { chunks = append(chunks, ch); return nil })
	short := chunks[1] // heights 11-21: block 15 has 3 txs
	short.Txs = short.Txs[:len(short.Txs)-1]
	if err := writeChunk(c, short); err != nil {
		t.Fatal(err)
	}
	if err := removeChunk(c, chunks[2]); err != nil { // heights 21-31
		t.Fatal(err)
	}
	if got := cachedTxs(t, c); got != 5 {
		t.Fatalf("damaged cache has %d txs, want 5", got)
	}

	repaired, err := verify(context.Background(), c)
	if err != nil {
		t.Fatal(err)
	}
	if repaired != 2 || cachedTxs(t, c) != 9 {
		t.Fatalf("repaired %d chunks, cache has %d txs; want 2 and 9", repaired, cachedTxs(t, c))
	}
	if repaired, _ := verify(context.Background(), c); repaired != 0 {
		t.Fatalf("second verify repaired %d chunks, want 0", repaired)
	}

	d, err := loadDataset(c)
	if err != nil {
		t.Fatal(err)
	}
	if ok, err := d.cacheMatchesChain(context.Background(), c); err != nil || !ok {
		t.Fatalf("cacheMatchesChain = %v, %v after verify", ok, err)
	}
}

func TestLiveBlockCountsARedeliveredTxOnce(t *testing.T) {
	tx := func(i int) json.RawMessage { return json.RawMessage(fmt.Sprintf(`{"block_height":7,"index":%d}`, i)) }
	p := &pendingBlock{block: &blockEvent{Height: 7, NumTxs: 2}, txs: map[int]json.RawMessage{}}
	for _, raw := range []json.RawMessage{tx(0), tx(0)} { // the same tx twice
		p.txs[txIndex(raw)] = raw
	}
	if p.complete() {
		t.Fatal("a block with one distinct tx of two must not be complete")
	}
	p.txs[1] = tx(1)
	if !p.complete() {
		t.Fatal("block should be complete with both txs")
	}
}
