// Command wrapped builds the Gno Wrapped dataset.
//
//	wrapped live    keep data/out current: catch up, then follow new blocks over WebSocket
//	wrapped fetch   pull new block ranges from the tx-indexer into the raw cache
//	wrapped build   aggregate the raw cache into per-address JSON (no network)
//	wrapped stats   print distributions from the raw cache (no network)
//	wrapped all     fetch, then build
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	log.SetFlags(log.Ltime)
	cmd := "all"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	c := loadConfig()
	locked := func(fn func() error) error {
		unlock, err := lockData(c)
		if err != nil {
			return err
		}
		defer unlock()
		return fn()
	}
	var err error
	switch cmd {
	case "live":
		err = live(ctx, c)
	case "fetch":
		err = locked(func() error { return fetch(ctx, c) })
	case "build":
		err = locked(func() error { return build(c) })
	case "stats":
		err = stats(c)
	case "all":
		err = locked(func() error {
			if err := fetch(ctx, c); err != nil {
				return err
			}
			return build(c)
		})
	default:
		err = fmt.Errorf("unknown command %q (live | fetch | build | stats | all)", cmd)
	}
	if err != nil {
		log.Fatal(err)
	}
}
