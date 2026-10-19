package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// GraphQL subscriptions over WebSocket (graphql-transport-ws, as served by gqlgen in tx-indexer).
// Two subscriptions on one connection: every new block (height, time, tx count) and every new tx
// with the same fields the range queries store.

type liveEvent struct {
	height int
	block  *blockEvent     // set for block events
	tx     json.RawMessage // set for tx events
}

type blockEvent struct {
	Height int       `json:"height"`
	Time   time.Time `json:"time"`
	NumTxs int       `json:"num_txs"`
}

func wsURL(c config) string {
	if c.IndexerWSURL != "" {
		return c.IndexerWSURL
	}
	u := strings.Replace(c.IndexerURL, "https://", "wss://", 1)
	return strings.Replace(u, "http://", "ws://", 1)
}

// subscribe connects and streams events until ctx ends or the connection fails (the error is sent
// on errs, then both channels stop).
func subscribe(ctx context.Context, url string) (<-chan liveEvent, <-chan error, error) {
	dial, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(dial, url, &websocket.DialOptions{Subprotocols: []string{"graphql-transport-ws"}})
	if err != nil {
		return nil, nil, fmt.Errorf("dial %s: %w", url, err)
	}
	conn.SetReadLimit(16 << 20)

	if err := wsjson.Write(dial, conn, map[string]any{"type": "connection_init"}); err != nil {
		conn.CloseNow()
		return nil, nil, err
	}
	var ack struct{ Type string }
	if err := wsjson.Read(dial, conn, &ack); err != nil || ack.Type != "connection_ack" {
		conn.CloseNow()
		return nil, nil, fmt.Errorf("no connection_ack (got %q): %v", ack.Type, err)
	}
	for id, q := range map[string]string{
		"blocks": `subscription { getBlocks(where:{}) { height time num_txs } }`,
		"txs":    `subscription { getTransactions(where:{}) { ` + txFields + ` } }`,
	} {
		msg := map[string]any{"id": id, "type": "subscribe", "payload": map[string]string{"query": q}}
		if err := wsjson.Write(dial, conn, msg); err != nil {
			conn.CloseNow()
			return nil, nil, err
		}
	}

	events := make(chan liveEvent, 4096)
	errs := make(chan error, 1)
	go func() {
		defer conn.CloseNow()
		for {
			var m struct {
				ID      string          `json:"id"`
				Type    string          `json:"type"`
				Payload json.RawMessage `json:"payload"`
			}
			if err := wsjson.Read(ctx, conn, &m); err != nil {
				errs <- fmt.Errorf("read: %w", err)
				return
			}
			switch m.Type {
			case "ping":
				_ = wsjson.Write(ctx, conn, map[string]string{"type": "pong"})
				continue
			case "error", "complete":
				errs <- fmt.Errorf("subscription %s %s: %s", m.ID, m.Type, m.Payload)
				return
			case "next":
			default:
				continue
			}
			var p struct {
				Data struct {
					Block *blockEvent     `json:"getBlocks"`
					Tx    json.RawMessage `json:"getTransactions"`
				} `json:"data"`
				Errors []struct{ Message string } `json:"errors"`
			}
			if err := json.Unmarshal(m.Payload, &p); err != nil || len(p.Errors) > 0 {
				errs <- fmt.Errorf("bad %s payload: %v %v", m.ID, err, p.Errors)
				return
			}
			ev := liveEvent{block: p.Data.Block, tx: p.Data.Tx}
			if ev.block != nil {
				ev.height = ev.block.Height
			} else if ev.tx != nil {
				var h struct {
					BlockHeight int `json:"block_height"`
				}
				_ = json.Unmarshal(ev.tx, &h)
				ev.height = h.BlockHeight
			} else {
				continue
			}
			select {
			case events <- ev:
			case <-ctx.Done():
				return
			}
		}
	}()
	return events, errs, nil
}
