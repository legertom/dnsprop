package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/legertom/dnsprop/api/internal/config"
)

func testConfig() *config.Config {
	return &config.Config{
		Port:            "8080",
		LogLevel:        "debug",
		CorsOrigins:     []string{"http://localhost:5173"},
		Resolvers:       []string{"1.1.1.1", "8.8.8.8"},
		RequestTimeout:  200 * time.Millisecond,
		EnableDNSSEC:    false,
		CacheTTL:        100 * time.Millisecond,
		CacheMaxEntries: 100,
		RateLimitRPS:    100, // effectively disabled for tests
		RateLimitBurst:  100,
		RateLimitTTL:    time.Minute,
	}
}

func TestHealthz(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/api/healthz", nil)
	w := httptest.NewRecorder()
	Healthz(w, r)
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Result().StatusCode)
	}
	if body := w.Body.String(); body != "ok" {
		t.Fatalf("unexpected body: %q", body)
	}
}

func TestResolveHandler_InvalidJSON(t *testing.T) {
	cfg := testConfig()
	h := ResolveHandler(cfg, nil)
	r := httptest.NewRequest(http.MethodPost, "/api/resolve", bytes.NewBufferString("{bad json"))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Result().StatusCode)
	}
}

func TestResolveHandler_InvalidDomain(t *testing.T) {
	cfg := testConfig()
	h := ResolveHandler(cfg, nil)
	body := map[string]any{"name": "ex@mple.com", "type": "A"}
	buf, _ := json.Marshal(body)
	r := httptest.NewRequest(http.MethodPost, "/api/resolve", bytes.NewReader(buf))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Result().StatusCode)
	}
}

func TestResolveHandler_InvalidType(t *testing.T) {
	cfg := testConfig()
	h := ResolveHandler(cfg, nil)
	body := map[string]any{"name": "example.com", "type": "PTR"}
	buf, _ := json.Marshal(body)
	r := httptest.NewRequest(http.MethodPost, "/api/resolve", bytes.NewReader(buf))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Result().StatusCode)
	}
}

func TestResolveHandler_InvalidServers(t *testing.T) {
	cfg := testConfig()
	h := ResolveHandler(cfg, nil)
	body := map[string]any{"name": "example.com", "type": "A", "servers": []string{"dns.google"}}
	buf, _ := json.Marshal(body)
	r := httptest.NewRequest(http.MethodPost, "/api/resolve", bytes.NewReader(buf))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Result().StatusCode)
	}
}

func TestResolveHandler_ValidMinimal(t *testing.T) {
	cfg := testConfig()
	// Use localhost to keep quick failures/timeouts predictable
	h := ResolveHandler(cfg, nil)
	body := map[string]any{"name": "example.com", "type": "A", "servers": []string{"127.0.0.1"}}
	buf, _ := json.Marshal(body)
	r := httptest.NewRequest(http.MethodPost, "/api/resolve", bytes.NewReader(buf))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Result().StatusCode)
	}
	var out struct{ Name, Type string }
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if out.Name != "example.com" || out.Type != "A" {
		t.Fatalf("unexpected response: %+v", out)
	}
}

func TestDedupe(t *testing.T) {
	in := []string{"8.8.8.8", " ", "8.8.8.8", "1.1.1.1"}
	out := dedupe(in)
	if len(out) != 2 {
		t.Fatalf("expected 2 unique servers, got %d (%v)", len(out), out)
	}
}
