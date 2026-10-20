package main

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const addr = "g1wrappedsampleqqqqqqqqqqqqqqqqqqqqqqqqq"

const anyRedirect = 3 // test case code: any 3xx

func setup(t *testing.T) (string, http.Handler) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "s1"), 0o755); err != nil {
		t.Fatal(err)
	}
	write(t, dir, "s1/wr.json", `{"`+addr+`":{"address":"`+addr+`","txCount":2}}`)
	write(t, dir, "s1/meta.json", `{"dataAsOf":"2026-10-19"}`)
	write(t, dir, "s1/personas.json", `{"personas":[{"id":"builder"}]}`)
	write(t, dir, "s1/season.json", `{"busiestDay":{"date":"2026-10-14"}}`)
	if err := os.MkdirAll(filepath.Join(dir, "s1/share"), 0o755); err != nil {
		t.Fatal(err)
	}
	write(t, dir, "s1/share/do.json", `{"do439qv75pmz":{"address":"","shared":true}}`)
	return dir, newHandler(newStore(dir))
}

func write(t *testing.T, dir, rel, body string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, rel), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func get(h http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestRecap(t *testing.T) {
	_, h := setup(t)
	cases := []struct {
		path string
		code int
		body string
	}{
		{"/v1/s1/" + addr, 200, `"txCount":2`},
		{"/v1/s1/" + strings.ToUpper(addr[2:]), 400, "invalid"}, // missing g1 prefix
		{"/v1/s1/G1" + strings.ToUpper(addr[2:]), 200, `"txCount":2`},
		{"/v1/s1/g1wrappedemptyqqqqqqqqqqqqqqqqqqqqqqqqqq", 404, "no recap"},
		{"/v1/s1/not-an-address", 400, "invalid"},
		{"/v1/x1/" + addr, 400, "invalid"},
		{"/v1/s2/" + addr, 404, "no recap"},
		{"/v1/s1", 200, `"dataAsOf":"2026-10-19"`},
		{"/v1/s1/personas", 200, `"builder"`},
		{"/v1/s1/season", 200, `"busiestDay"`},
		{"/v1/s1/share/do439qv75pmz", 200, `"shared":true`},
		{"/v1/s1/share/do439qv75pmx", 404, "no recap"},
		{"/v1/s1/share/../../meta", anyRedirect, ""}, // ServeMux cleans the path and redirects (301 or 307 by Go version); nothing reaches the file system
		{"/v1/s1/share/DO439QV75PMZ", 400, "invalid"},
		{"/v1/s9", 404, "no data"},
		{"/healthz", 200, "ok"},
	}
	for _, c := range cases {
		rec := get(h, c.path)
		code := rec.Code
		if c.code == anyRedirect && code/100 == 3 {
			code = anyRedirect
		}
		if code != c.code || !strings.Contains(rec.Body.String(), c.body) {
			t.Errorf("%s: got %d %q, want %d containing %q", c.path, rec.Code, rec.Body.String(), c.code, c.body)
		}
	}
}

func TestReloadsChangedShard(t *testing.T) {
	dir, h := setup(t)
	get(h, "/v1/s1/"+addr) // cache it
	write(t, dir, "s1/wr.json", `{"`+addr+`":{"address":"`+addr+`","txCount":3}}`)
	later := time.Now().Add(time.Second)
	if err := os.Chtimes(filepath.Join(dir, "s1/wr.json"), later, later); err != nil {
		t.Fatal(err)
	}
	if body := get(h, "/v1/s1/"+addr).Body.String(); !strings.Contains(body, `"txCount":3`) {
		t.Fatalf("stale shard after rebuild: %s", body)
	}
}

func TestAccessLog(t *testing.T) {
	_, h := setup(t)
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, nil)))
	defer slog.SetDefault(prev)

	h = accessLog(h)
	get(h, "/v1/s1/"+addr)
	get(h, "/v1/s1/not-an-address")
	get(h, "/healthz")

	out := buf.String()
	for _, want := range []string{"path=/v1/s1/" + addr + " status=200", "path=/v1/s1/not-an-address status=400", "shard loaded"} {
		if !strings.Contains(out, want) {
			t.Errorf("log missing %q:\n%s", want, out)
		}
	}
	if strings.Contains(out, "/healthz") {
		t.Errorf("healthz should not be logged:\n%s", out)
	}
}
