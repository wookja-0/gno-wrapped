package main

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// Share IDs: each address gets a random, unguessable ID for public share links (/s1/s/<id>), so a
// shared recap doesn't reveal the address. IDs are random rather than derived from the address, so
// there's no secret to keep and no way back from ID to address without data/share-ids.json.
// They are stored and reused so links keep working across rebuilds.

// Lowercase only: IDs also name shard files (<id[:2]>.json), and macOS / Windows file systems
// don't tell "Ab" from "ab".
const shareIDLen = 12 // base36, ~62 bits
const base36 = "0123456789abcdefghijklmnopqrstuvwxyz"

type shareIDs struct {
	path  string
	byAdr map[string]string
	used  map[string]bool
	dirty bool
}

func loadShareIDs(c config) (*shareIDs, error) {
	s := &shareIDs{path: filepath.Join(c.DataDir, "share-ids.json"), byAdr: map[string]string{}, used: map[string]bool{}}
	b, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(b, &s.byAdr); err != nil {
		return nil, err
	}
	for _, id := range s.byAdr {
		s.used[id] = true
	}
	return s, nil
}

func (s *shareIDs) get(addr string) string {
	if id, ok := s.byAdr[addr]; ok {
		return id
	}
	for {
		id := randomID()
		if !s.used[id] {
			s.byAdr[addr], s.used[id], s.dirty = id, true, true
			return id
		}
	}
}

func (s *shareIDs) save() error {
	if !s.dirty {
		return nil
	}
	b, _ := json.Marshal(s.byAdr)
	if err := writeFileAtomic(s.path, b); err != nil {
		return err
	}
	s.dirty = false
	return nil
}

func randomID() string {
	out := make([]byte, 0, shareIDLen)
	buf := make([]byte, 32)
	for len(out) < shareIDLen {
		if _, err := rand.Read(buf); err != nil {
			panic(err) // crypto/rand never fails on supported platforms
		}
		for _, b := range buf {
			if b < 252 && len(out) < shareIDLen { // 252 = 36*7: reject the rest so every character is equally likely
				out = append(out, base36[int(b)%len(base36)])
			}
		}
	}
	return string(out)
}

// activeDaysPerWeek folds a daily series into active days (0–7) per 7-day week.
func activeDaysPerWeek(daily []int) []int {
	weeks := make([]int, (len(daily)+6)/7)
	for i, n := range daily {
		if n > 0 {
			weeks[i/7]++
		}
	}
	return weeks
}

// redact returns the recap as shown behind a share link: no address in any form (the short
// g1xxxx…xxxx form alone identifies every address), no tx hash (it resolves to the address on an
// explorer), no exact arrival order (same), and realm paths with the address in them masked.
func redact(w wrapped) wrapped {
	addr := w.Address
	mask := func(p string) string { return strings.ReplaceAll(p, addr, "…") }
	w.Address = ""
	w.Shared = true
	w.FirstTx.Hash = ""
	w.Arrival.Order = 0 // arrival order is a direct lookup into chain data; keep only the tier
	achievements := make([]achievement, len(w.Achievements))
	for i, a := range w.Achievements {
		a.Realms = nil // which realms you were first into, plus a 1-in-10 slot, narrows you down
		achievements[i] = a
	}
	w.Achievements = achievements
	w.Calendar = calendar{Weeks: activeDaysPerWeek(w.Calendar.Daily), ActiveDays: w.Calendar.ActiveDays, LongestStreak: w.Calendar.LongestStreak}
	realms := make([]realmStat, len(w.TopRealms))
	for i, r := range w.TopRealms {
		r.Path = mask(r.Path)
		realms[i] = r
	}
	w.TopRealms = realms
	deployed := make([]string, len(w.DeployedRealms))
	for i, p := range w.DeployedRealms {
		deployed[i] = mask(p)
	}
	w.DeployedRealms = deployed
	if w.Builder != nil {
		builder := make([]realmReport, len(w.Builder))
		for i, r := range w.Builder {
			r.Path = mask(r.Path)
			builder[i] = r
		}
		w.Builder = builder
	}
	return w
}
