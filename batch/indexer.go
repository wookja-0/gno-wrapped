package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
	"time"
)

// errTooMany is returned when the indexer truncated a result at its
// per-query cap (10,000 matches). The caller must split the range.
var errTooMany = errors.New("indexer result truncated (max elements per query)")

type indexer struct {
	url   string
	http  *http.Client
	delay time.Duration
	last  time.Time
}

func newIndexer(c config) *indexer {
	return &indexer{url: c.IndexerURL, http: &http.Client{Timeout: 90 * time.Second}, delay: c.RequestDelay}
}

// query sends one GraphQL request, spacing requests by at least ix.delay.
func (ix *indexer) query(ctx context.Context, q string, out any) error {
	if wait := ix.delay - time.Since(ix.last); wait > 0 {
		select {
		case <-time.After(wait):
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*attempt) * 5 * time.Second)
		}
		ix.last = time.Now()
		lastErr = ix.do(ctx, q, out)
		if lastErr == nil || errors.Is(lastErr, errTooMany) || ctx.Err() != nil {
			return lastErr
		}
	}
	return lastErr
}

func (ix *indexer) do(ctx context.Context, q string, out any) error {
	body, _ := json.Marshal(map[string]string{"query": q})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, ix.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "gno-wrapped-batch")

	resp, err := ix.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("indexer HTTP %d: %.200s", resp.StatusCode, raw)
	}

	var env struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(raw, &env); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	for _, e := range env.Errors {
		if strings.Contains(e.Message, "max elements per query") {
			return errTooMany
		}
	}
	if len(env.Errors) > 0 {
		return fmt.Errorf("indexer error: %s", env.Errors[0].Message)
	}
	return json.Unmarshal(env.Data, out)
}

func (ix *indexer) latestHeight(ctx context.Context) (int, error) {
	var r struct {
		LatestBlockHeight int `json:"latestBlockHeight"`
	}
	err := ix.query(ctx, `{ latestBlockHeight }`, &r)
	return r.LatestBlockHeight, err
}

// Fields kept in the raw cache. Keep this generous so aggregation changes
// never require re-fetching from the indexer. Only fields in the upstream
// gnolang/tx-indexer schema (no fork extensions such as `signatures`), so any
// public indexer works.
const txFields = `block_height index hash success gas_used
  gas_fee { amount denom }
  messages { route typeUrl value {
    __typename
    ... on MsgCall { caller pkg_path func send }
    ... on BankMsgSend { from_address to_address amount }
    ... on MsgAddPackage { creator package { path } }
    ... on MsgRun { caller package { path } }
    ... on MsgEnablePackage { approver pkg_path }
  } }
  response { events {
    __typename
    ... on GnoEvent { type pkg_path attrs { key value } }
  } }`

// txRange returns all transactions with from <= height < to.
func (ix *indexer) txRange(ctx context.Context, from, to int) ([]json.RawMessage, error) {
	q := fmt.Sprintf(`{ getTransactions(where:{block_height:{gt:%d,lt:%d}}, order:{heightAndIndex:ASC}) { %s } }`, from-1, to, txFields)
	var r struct {
		Txs []json.RawMessage `json:"getTransactions"`
	}
	err := ix.query(ctx, q, &r)
	return r.Txs, err
}

type blockTime struct {
	Height int       `json:"height"`
	Time   time.Time `json:"time"`
	NumTxs int       `json:"num_txs,omitempty"` // 0 in chunks cached before it was recorded
}

// blockTimes returns every block with at least one tx in [from, to): its time and tx count.
func (ix *indexer) blockTimes(ctx context.Context, from, to int) ([]blockTime, error) {
	q := fmt.Sprintf(`{ getBlocks(where:{height:{gt:%d,lt:%d}, num_txs:{gt:0}}, order:{height:ASC}) { height time num_txs } }`, from-1, to)
	var r struct {
		Blocks []blockTime `json:"getBlocks"`
	}
	err := ix.query(ctx, q, &r)
	return r.Blocks, err
}

// totalTxsAt returns the chain's running tx count (total_txs: every tx up to and including the
// block) at each height, a few dozen heights per request.
func (ix *indexer) totalTxsAt(ctx context.Context, heights []int) (map[int]int, error) {
	out := map[int]int{0: 0}
	heights = slices.DeleteFunc(slices.Clone(heights), func(h int) bool { return h <= 0 })
	for i := 0; i < len(heights); i += 25 {
		var q strings.Builder
		q.WriteString("{")
		for j, h := range heights[i:min(i+25, len(heights))] {
			fmt.Fprintf(&q, " b%d: getBlocks(where:{height:{gt:%d,lt:%d}}) { height total_txs }", j, h-1, h+1)
		}
		q.WriteString(" }")
		var r map[string][]struct {
			Height   int `json:"height"`
			TotalTxs int `json:"total_txs"`
		}
		if err := ix.query(ctx, q.String(), &r); err != nil {
			return nil, err
		}
		for _, bs := range r {
			for _, b := range bs {
				out[b.Height] = b.TotalTxs
			}
		}
	}
	for _, h := range heights {
		if _, ok := out[h]; !ok {
			return nil, fmt.Errorf("block %d not found", h)
		}
	}
	return out, nil
}

func (ix *indexer) genesisTime(ctx context.Context) (time.Time, error) {
	var r struct {
		Blocks []blockTime `json:"getBlocks"`
	}
	if err := ix.query(ctx, `{ getBlocks(where:{height:{eq:1}}) { height time } }`, &r); err != nil {
		return time.Time{}, err
	}
	if len(r.Blocks) == 0 {
		return time.Time{}, errors.New("block 1 not found")
	}
	return r.Blocks[0].Time, nil
}
