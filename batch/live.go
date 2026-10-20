package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"time"
)

// live keeps data/out current: it catches up over HTTP, then follows new blocks over the
// indexer's WebSocket subscriptions, applying each block once all of its txs have arrived and
// rewriting changed output files every couple of seconds. Any gap (dropped connection, a block
// whose txs don't all show up) ends the session; the next one refills it with range queries.

const (
	checkEvery   = 10 * time.Minute // compare the cache with the chain's tx count this often
	flushEvery   = 2 * time.Second
	stallAfter   = 20 * time.Second // a block still incomplete this long → reconnect and refill
	silenceAfter = 60 * time.Second // no events at all this long → the connection is dead
)

func live(ctx context.Context, c config) error {
	unlock, err := lockData(c)
	if err != nil {
		return err
	}
	defer unlock()
	ids, err := loadShareIDs(c)
	if err != nil {
		return err
	}
	f := &follower{c: c, ids: ids, out: newOutWriter(c)}
	backoff := 5 * time.Second
	for ctx.Err() == nil {
		started := time.Now()
		err := f.session(ctx)
		if ctx.Err() != nil {
			return nil
		}
		if time.Since(started) > 5*time.Minute {
			backoff = 5 * time.Second // it had been running fine; retry soon
		}
		log.Printf("live: %v; reconnecting in %s", err, backoff)
		select {
		case <-time.After(backoff):
		case <-ctx.Done():
			return nil
		}
		backoff = min(backoff*2, 2*time.Minute)
	}
	return nil
}

type follower struct {
	c   config
	ids *shareIDs
	out *outWriter
	d   *dataset
}

type pendingBlock struct {
	block *blockEvent
	txs   map[int]json.RawMessage // by index within the block, so a redelivered tx counts once
	since time.Time
}

func (p *pendingBlock) complete() bool { return p.block != nil && len(p.txs) >= p.block.NumTxs }

// liveChunk is the raw-cache chunk being grown from subscription data: [from, to).
type liveChunk struct {
	from, to, written int // written = the `to` of the file currently on disk (0 = none)
	txs               []json.RawMessage
	blocks            []blockTime
}

func (f *follower) session(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Subscribe before catching up, so nothing between the catch-up tip and the first event is lost;
	// events below the catch-up tip are dropped.
	events, errs, err := subscribe(ctx, wsURL(f.c))
	if err != nil {
		return err
	}
	if err := f.catchUp(ctx); err != nil {
		return err
	}
	if err := f.flushOutput(0); err != nil {
		return err
	}
	log.Printf("live: following from height %d", f.d.st.FetchedTo)

	next := f.d.st.FetchedTo
	lc := &liveChunk{from: next, to: next}
	pending := map[int]*pendingBlock{}
	tick := time.NewTicker(flushEvery)
	defer tick.Stop()
	lastEvent, lastCheck, applied := time.Now(), time.Now(), 0

	flush := func() error {
		if lc.to == lc.written {
			return nil
		}
		if err := f.persist(lc); err != nil {
			return err
		}
		if err := f.flushOutput(applied); err != nil {
			return err
		}
		applied = 0
		return nil
	}

	for {
		select {
		case <-ctx.Done():
			return flush()
		case err := <-errs:
			if ferr := flush(); ferr != nil {
				return ferr
			}
			return err
		case ev := <-events:
			lastEvent = time.Now()
			if ev.height < next {
				continue
			}
			p := pending[ev.height]
			if p == nil {
				p = &pendingBlock{txs: map[int]json.RawMessage{}, since: time.Now()}
				pending[ev.height] = p
			}
			if ev.block != nil {
				p.block = ev.block
			} else {
				p.txs[txIndex(ev.tx)] = ev.tx
			}
			for p := pending[next]; p != nil && p.complete(); p = pending[next] {
				n, err := f.apply(lc, p)
				if err != nil {
					return err
				}
				applied += n
				delete(pending, next)
				next++
			}
		case <-tick.C:
			if err := flush(); err != nil {
				return err
			}
			if time.Since(lastEvent) > silenceAfter {
				return fmt.Errorf("no events for %s", silenceAfter)
			}
			if time.Since(lastCheck) > checkEvery {
				lastCheck = time.Now()
				if ok, err := f.d.cacheMatchesChain(ctx, f.c); err != nil {
					log.Printf("live: check against the chain failed: %v", err)
				} else if !ok {
					f.d = nil // the next session verifies the cache and rebuilds from it
					return errors.New("cache doesn't match the chain; verifying")
				}
			}
			// A later block is in, but `next` is missing or incomplete: a gap the subscription won't fill.
			for h, p := range pending {
				if h > next && time.Since(p.since) > stallAfter {
					return fmt.Errorf("gap at height %d (have %d)", next, h)
				}
			}
			if p := pending[next]; p != nil && !p.complete() && time.Since(p.since) > stallAfter {
				return fmt.Errorf("block %d incomplete after %s", next, stallAfter)
			}
		}
	}
}

// catchUp range-fetches everything since the last persisted height and applies it. Without a
// dataset (first session, or the cache failed a check) it verifies the whole cache first.
func (f *follower) catchUp(ctx context.Context) error {
	if f.d == nil {
		if _, err := verify(ctx, f.c); err != nil {
			return fmt.Errorf("verify: %w", err)
		}
	}
	before, err := loadState(f.c)
	if err != nil {
		return err
	}
	if err := fetch(ctx, f.c); err != nil {
		return err
	}
	if f.d == nil {
		d, err := loadDataset(f.c)
		if err != nil {
			return err
		}
		f.d = d
		return nil
	}
	if err := readChunksFrom(f.c, before.FetchedTo, f.d.applyChunk); err != nil {
		return err
	}
	f.d.st, err = loadState(f.c)
	return err
}

// apply adds one complete block to the dataset and the live chunk; returns its tx count.
func (f *follower) apply(lc *liveChunk, p *pendingBlock) (int, error) {
	b := p.block
	if len(p.txs) != b.NumTxs {
		return 0, fmt.Errorf("block %d: %d txs, block says %d", b.Height, len(p.txs), b.NumTxs)
	}
	if b.NumTxs > 0 {
		idx := slices.Sorted(maps.Keys(p.txs))
		txs := make([]json.RawMessage, len(idx))
		for i, k := range idx {
			txs[i] = p.txs[k]
		}
		bt := blockTime{Height: b.Height, Time: b.Time, NumTxs: b.NumTxs}
		if err := f.d.applyChunk(chunk{From: b.Height, To: b.Height + 1, Txs: txs, Blocks: []blockTime{bt}}); err != nil {
			return 0, err
		}
		lc.txs = append(lc.txs, txs...)
		lc.blocks = append(lc.blocks, bt)
	}
	lc.to = b.Height + 1
	f.d.st.TipTime = b.Time
	return b.NumTxs, nil
}

func txIndex(raw json.RawMessage) int {
	var t struct {
		Index int `json:"index"`
	}
	_ = json.Unmarshal(raw, &t)
	return t.Index
}

// persist writes the live chunk as <from>-<to>, records the new cursor, then removes the previous
// (shorter) file of the same chunk. A crash in between leaves both; readChunks reads the longer.
func (f *follower) persist(lc *liveChunk) error {
	if err := writeChunk(f.c, chunk{From: lc.from, To: lc.to, Txs: lc.txs, Blocks: lc.blocks}); err != nil {
		return err
	}
	f.d.st.FetchedTo = lc.to
	if err := saveState(f.c, f.d.st); err != nil {
		return err
	}
	if lc.written != 0 && lc.written != lc.to {
		old := filepath.Join(rawDir(f.c), "chunks", fmt.Sprintf("%010d-%010d.json.gz", lc.from, lc.written))
		if err := os.Remove(old); err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}
	lc.written = lc.to
	if lc.to-lc.from >= f.c.ChunkBlocks { // start a new chunk file
		*lc = liveChunk{from: lc.to, to: lc.to}
	}
	return nil
}

func (f *follower) flushOutput(newTxs int) error {
	files, err := f.d.render(f.ids, time.Now())
	if err != nil {
		return err
	}
	if err := f.ids.save(); err != nil {
		return err
	}
	n, err := f.out.write(files)
	if err != nil {
		return err
	}
	if newTxs > 0 {
		log.Printf("live: height %d, +%d txs, %d files written, %d addresses", f.d.st.FetchedTo-1, newTxs, n, len(f.d.accs))
	}
	return nil
}
