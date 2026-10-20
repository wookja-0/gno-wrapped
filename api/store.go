package main

import (
	"encoding/json"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// store reads batch shards (<dir>/<season>/<xx>.json: address → recap) and keeps each one in
// memory until its file changes. Recaps are returned as the raw bytes the batch wrote.
type store struct {
	dir string
	mu  sync.Mutex
	m   map[string]shard
}

type shard struct {
	mod  time.Time
	size int64
	data map[string]json.RawMessage
}

func newStore(dir string) *store { return &store{dir: dir, m: map[string]shard{}} }

// recap returns the address's JSON, or nil when the batch has nothing for it.
func (s *store) recap(season, address string) (json.RawMessage, error) {
	sh, err := s.load(filepath.Join(season, address[2:4]+".json"))
	if err != nil || sh == nil {
		return nil, err
	}
	return sh[address], nil
}

// shared returns the redacted recap behind a share ID, or nil.
func (s *store) shared(season, id string) (json.RawMessage, error) {
	sh, err := s.load(filepath.Join(season, "share", id[:2]+".json"))
	if err != nil || sh == nil {
		return nil, err
	}
	return sh[id], nil
}

// day returns the address's txs on one day (YYYY-MM-DD), or nil when there are none.
func (s *store) day(season, address, date string) (json.RawMessage, error) {
	sh, err := s.load(filepath.Join(season, "days", address[2:4]+".json"))
	if err != nil || sh == nil || sh[address] == nil {
		return nil, err
	}
	var byDate map[string]json.RawMessage
	if err := json.Unmarshal(sh[address], &byDate); err != nil {
		return nil, err
	}
	return byDate[date], nil
}

// file returns one of the season's single files (meta.json, personas.json), or nil if missing.
func (s *store) file(season, name string) (json.RawMessage, error) {
	b, err := os.ReadFile(filepath.Join(s.dir, season, name))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	return b, err
}

func (s *store) load(rel string) (map[string]json.RawMessage, error) {
	path := filepath.Join(s.dir, rel)
	fi, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	cached, ok := s.m[rel]
	s.mu.Unlock()
	if ok && cached.mod.Equal(fi.ModTime()) && cached.size == fi.Size() {
		return cached.data, nil
	}

	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var data map[string]json.RawMessage
	if err := json.Unmarshal(b, &data); err != nil {
		return nil, err
	}
	s.mu.Lock()
	s.m[rel] = shard{mod: fi.ModTime(), size: fi.Size(), data: data}
	s.mu.Unlock()
	slog.Info("shard loaded", "file", rel, "addresses", len(data), "reload", ok)
	return data, nil
}
