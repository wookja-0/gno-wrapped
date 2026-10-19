package main

import (
	"os"
	"regexp"
	"strconv"
	"time"
)

// Season is part of the JSON contract the web app reads. It is required.
type Season struct {
	ID    string `json:"id"`
	Start string `json:"start"` // YYYY-MM-DD, UTC
	End   string `json:"end"`   // YYYY-MM-DD, UTC, inclusive
}

var season = Season{ID: "s1", Start: "2026-09-12", End: "2026-12-31"}

type config struct {
	IndexerURL   string
	IndexerWSURL string // default: IndexerURL with https→wss
	DataDir      string
	ChunkBlocks  int
	RequestDelay time.Duration
}

func loadConfig() config {
	return config{
		IndexerURL:   env("INDEXER_URL", "https://indexer.gno.land/graphql/query"),
		IndexerWSURL: os.Getenv("INDEXER_WS_URL"),
		DataDir:      env("DATA_DIR", "../data"),
		ChunkBlocks:  envInt("CHUNK_BLOCKS", 10000),
		RequestDelay: envDuration("REQUEST_DELAY", 3*time.Second),
	}
}

// Persona rules, checked in order (see choosePersona). Tuned on the 2026-10-19 data with
// `wrapped stats`: first-steps 48% (1–2 GNOT transfers only), gnot-courier 31%, defi-pilot 10%,
// realm-hopper 4%, collector 3%, day-one-explorer 1.5%, player-one 1%, builder 0.6%.
var personaRules = struct {
	DayOneMaxDay       int     // first tx within this many mainnet days → Day-One Explorer
	HopperMinRealms    int     // distinct realms called → Realm Hopper
	CategoryMinShare   float64 // share of messages in one category → DeFi Pilot / Collector / Player One
	CourierMinTxs      int     // transfer-mostly accounts with at least this many txs → GNOT Courier
	BotMinTxs          int     // bot heuristic: at least this many txs, and either...
	BotMinTopActionPct float64 // ...this share of messages being the same action, or
	BotMinTxsPerDay    float64 // ...this many txs per day between first and last tx
}{
	DayOneMaxDay:       3,
	HopperMinRealms:    8,
	CategoryMinShare:   0.5,
	CourierMinTxs:      3,
	BotMinTxs:          500,
	BotMinTopActionPct: 0.95,
	BotMinTxsPerDay:    200,
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func envInt(k string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(k)); err == nil && v > 0 {
		return v
	}
	return def
}

func envDuration(k string, def time.Duration) time.Duration {
	if v, err := time.ParseDuration(os.Getenv(k)); err == nil && v >= 0 {
		return v
	}
	return def
}

// Message categories for personas. Realms are matched by path; NFT activity also by function.
var (
	defiRealm = regexp.MustCompile(`^gno\.land/r/(gnoswap/|gnoland/wugnot$)`)
	gameRealm = regexp.MustCompile(`(?i)bubble|rumble|gnofly/game|golf|gnotchi|akkadia`)
	nftRealm  = regexp.MustCompile(`(?i)/nfts?(/|$)`)
	nftFuncs  = map[string]bool{"Mint": true, "PublicMint": true, "Buy": true, "MintNFT": true, "SafeMint": true, "BatchMint": true}
)

func messageCategory(typename, pkgPath, fn string) string {
	switch {
	case typename == "BankMsgSend":
		return "transfer"
	case typename != "MsgCall":
		return "other"
	case defiRealm.MatchString(pkgPath):
		return "defi"
	case gameRealm.MatchString(pkgPath):
		return "play"
	case nftFuncs[fn] || nftRealm.MatchString(pkgPath):
		return "collect"
	}
	return "other"
}
