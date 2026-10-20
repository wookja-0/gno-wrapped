// Command api serves the batch output to the web app.
//
//	GET /v1/{season}/{address}   one address's recap (the JSON contract in web/src/lib/wrapped.ts), 404 if none
//	GET /v1/{season}             season meta: dataAsOf, totals
//	GET /v1/{season}/season      the whole chain's season (/season page)
//	GET /healthz
//
// It reads DATA_DIR/<season>/<xx>.json shards written by the batch and reloads a shard when the
// file changes, so a batch rebuild is picked up without a restart.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// One line per event on stdout: `docker compose logs -f api`.
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))
	addr, dir := env("LISTEN_ADDR", ":8080"), env("DATA_DIR", "../data/out")
	srv := &http.Server{
		Addr:              addr,
		Handler:           accessLog(newHandler(newStore(dir))),
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		slog.Info("listening", "addr", addr, "data_dir", dir)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "err", err)
			os.Exit(1)
		}
	}()
	<-ctx.Done()
	slog.Info("shutting down")
	shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdown)
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
