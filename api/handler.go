package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
)

var (
	seasonRE  = regexp.MustCompile(`^s\d+$`)
	addressRE = regexp.MustCompile(`^g1[02-9ac-hj-np-z]{38}$`) // bech32 charset, same as the web app
	shareRE   = regexp.MustCompile(`^[0-9a-z]{12}$`)           // batch share IDs (share.go)
	dateRE    = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
)

func newHandler(st *store) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("GET /v1/{season}", func(w http.ResponseWriter, r *http.Request) {
		season := r.PathValue("season")
		if !seasonRE.MatchString(season) {
			fail(w, http.StatusBadRequest, "invalid season")
			return
		}
		b, err := st.file(season, "meta.json")
		respond(w, b, err, "no data for this season")
	})
	for _, name := range []string{"personas", "season"} { // /personas and /season pages
		mux.HandleFunc("GET /v1/{season}/"+name, func(w http.ResponseWriter, r *http.Request) {
			season := r.PathValue("season")
			if !seasonRE.MatchString(season) {
				fail(w, http.StatusBadRequest, "invalid season")
				return
			}
			b, err := st.file(season, name+".json")
			respond(w, b, err, "no data for this season")
		})
	}
	// Share links: the recap with every trace of the address removed (the batch redacts it).
	mux.HandleFunc("GET /v1/{season}/share/{id}", func(w http.ResponseWriter, r *http.Request) {
		season, id := r.PathValue("season"), r.PathValue("id")
		if !seasonRE.MatchString(season) || !shareRE.MatchString(id) {
			fail(w, http.StatusBadRequest, "invalid season or share id")
			return
		}
		b, err := st.shared(season, id)
		respond(w, b, err, "no recap for this share link")
	})
	// The calendar's day list: that day's first txs, by address only (hashes lead to the address, so
	// there is no share-link version).
	mux.HandleFunc("GET /v1/{season}/{address}/days/{date}", func(w http.ResponseWriter, r *http.Request) {
		season, address, date := r.PathValue("season"), strings.ToLower(r.PathValue("address")), r.PathValue("date")
		if !seasonRE.MatchString(season) || !addressRE.MatchString(address) || !dateRE.MatchString(date) {
			fail(w, http.StatusBadRequest, "invalid season, address or date")
			return
		}
		b, err := st.day(season, address, date)
		respond(w, b, err, "no transactions that day")
	})
	mux.HandleFunc("GET /v1/{season}/{address}", func(w http.ResponseWriter, r *http.Request) {
		season, address := r.PathValue("season"), strings.ToLower(r.PathValue("address"))
		if !seasonRE.MatchString(season) || !addressRE.MatchString(address) {
			fail(w, http.StatusBadRequest, "invalid season or address")
			return
		}
		b, err := st.recap(season, address)
		respond(w, b, err, "no recap for this address")
	})
	return mux
}

func respond(w http.ResponseWriter, body json.RawMessage, err error, notFound string) {
	switch {
	case err != nil:
		slog.Error("read failed", "err", err)
		fail(w, http.StatusInternalServerError, "internal error")
	case body == nil:
		fail(w, http.StatusNotFound, notFound)
	default:
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=10") // the batch updates live
		w.Write(body)
	}
}

func fail(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
