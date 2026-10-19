package main

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
)

// lockData takes an exclusive lock on the data directory, so `live` and one-off fetch/build
// runs never write the raw cache or the output at the same time.
func lockData(c config) (func(), error) {
	if err := os.MkdirAll(c.DataDir, 0o755); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(filepath.Join(c.DataDir, ".lock"), os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return nil, err
	}
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		f.Close()
		return nil, fmt.Errorf("data dir %s is in use (is `wrapped live` running?): %w", c.DataDir, err)
	}
	return func() { syscall.Flock(int(f.Fd()), syscall.LOCK_UN); f.Close() }, nil
}
