package main

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"
)

// Raw cache layout under DATA_DIR/raw:
//   state.json                       fetch cursor (heights < fetchedTo are complete)
//   chunks/<from>-<to>.json.gz       txs + block times for heights [from, to)
//
// gno.land has instant finality, so a chunk below the tip never changes.

type fetchState struct {
	FetchedTo   int       `json:"fetchedTo"`
	GenesisTime time.Time `json:"genesisTime"`
	TipTime     time.Time `json:"tipTime"`
}

type chunk struct {
	From   int               `json:"from"`
	To     int               `json:"to"`
	Txs    []json.RawMessage `json:"txs"`
	Blocks []blockTime       `json:"blocks"`
}

func rawDir(c config) string { return filepath.Join(c.DataDir, "raw") }

func loadState(c config) (fetchState, error) {
	s := fetchState{FetchedTo: 1}
	b, err := os.ReadFile(filepath.Join(rawDir(c), "state.json"))
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	return s, json.Unmarshal(b, &s)
}

func saveState(c config, s fetchState) error {
	b, _ := json.MarshalIndent(s, "", "  ")
	return writeFileAtomic(filepath.Join(rawDir(c), "state.json"), b)
}

func fetch(ctx context.Context, c config) error {
	if err := os.MkdirAll(filepath.Join(rawDir(c), "chunks"), 0o755); err != nil {
		return err
	}
	st, err := loadState(c)
	if err != nil {
		return err
	}
	ix := newIndexer(c)

	if st.GenesisTime.IsZero() {
		if st.GenesisTime, err = ix.genesisTime(ctx); err != nil {
			return fmt.Errorf("genesis time: %w", err)
		}
	}
	tip, err := ix.latestHeight(ctx)
	if err != nil {
		return fmt.Errorf("latest height: %w", err)
	}
	if st.FetchedTo > tip {
		log.Printf("up to date (fetchedTo=%d, tip=%d)", st.FetchedTo, tip)
		return nil
	}
	log.Printf("fetching heights %d..%d in chunks of %d, %s between requests", st.FetchedTo, tip, c.ChunkBlocks, c.RequestDelay)

	for from := st.FetchedTo; from <= tip; {
		to := min(from+c.ChunkBlocks, tip+1)
		ch, err := fetchChunk(ctx, ix, from, to)
		if err != nil {
			return fmt.Errorf("chunk %d-%d: %w", from, to, err)
		}
		if err := writeChunk(c, ch); err != nil {
			return err
		}
		if n := len(ch.Blocks); n > 0 {
			st.TipTime = ch.Blocks[n-1].Time
		}
		st.FetchedTo = to
		if err := saveState(c, st); err != nil {
			return err
		}
		log.Printf("chunk %d-%d: %d txs, %d blocks with txs", from, to, len(ch.Txs), len(ch.Blocks))
		from = to
	}
	return nil
}

// fetchChunk fetches [from, to), halving the range when the indexer truncates.
func fetchChunk(ctx context.Context, ix *indexer, from, to int) (chunk, error) {
	txs, err := ix.txRange(ctx, from, to)
	if errors.Is(err, errTooMany) && to-from > 1 {
		mid := from + (to-from)/2
		log.Printf("range %d-%d truncated, splitting at %d", from, to, mid)
		a, err := fetchChunk(ctx, ix, from, mid)
		if err != nil {
			return chunk{}, err
		}
		b, err := fetchChunk(ctx, ix, mid, to)
		if err != nil {
			return chunk{}, err
		}
		return chunk{From: from, To: to, Txs: append(a.Txs, b.Txs...), Blocks: append(a.Blocks, b.Blocks...)}, nil
	}
	if err != nil {
		return chunk{}, err
	}
	blocks, err := ix.blockTimes(ctx, from, to)
	if err != nil {
		return chunk{}, err
	}
	return chunk{From: from, To: to, Txs: txs, Blocks: blocks}, nil
}

func writeChunk(c config, ch chunk) error {
	if err := os.MkdirAll(filepath.Join(rawDir(c), "chunks"), 0o755); err != nil {
		return err
	}
	path := filepath.Join(rawDir(c), "chunks", fmt.Sprintf("%010d-%010d.json.gz", ch.From, ch.To))
	tmp := path + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	zw := gzip.NewWriter(f)
	if err := json.NewEncoder(zw).Encode(ch); err != nil {
		f.Close()
		return err
	}
	if err := zw.Close(); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// readChunks streams every cached chunk in height order.
func readChunks(c config, fn func(chunk) error) error { return readChunksFrom(c, 0, fn) }

// readChunksFrom streams cached chunks starting at height `from` or later, in height order.
// `live` rewrites its current chunk as it grows (<from>-<to> with a larger <to> each time); if a
// crash left two files with the same <from>, only the longest one is read.
func readChunksFrom(c config, from int, fn func(chunk) error) error {
	all, err := filepath.Glob(filepath.Join(rawDir(c), "chunks", "*.json.gz"))
	if err != nil {
		return err
	}
	sort.Strings(all) // zero-padded <from>-<to>: lexical order is height order
	var paths []string
	for i, p := range all {
		start := filepath.Base(p)[:10]
		if i+1 < len(all) && filepath.Base(all[i+1])[:10] == start {
			continue // a longer chunk with the same start follows
		}
		if n, _ := strconv.Atoi(start); n >= from {
			paths = append(paths, p)
		}
	}
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		zr, err := gzip.NewReader(f)
		if err != nil {
			f.Close()
			return fmt.Errorf("%s: %w", p, err)
		}
		var ch chunk
		err = json.NewDecoder(zr).Decode(&ch)
		f.Close()
		if err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
		if err := fn(ch); err != nil {
			return err
		}
	}
	return nil
}

func writeFileAtomic(path string, b []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
