package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/legertom/dnsprop/api/internal/config"
)

func TestCORSPreflight_AllowsConfiguredOrigin(t *testing.T) {
	cfg := &config.Config{
		Port:           "8080",
		LogLevel:       "info",
		CorsOrigins:    []string{"http://example.com"},
		Resolvers:      []string{"203.0.113.1"},
		RequestTimeout: 200 * time.Millisecond,
		CacheTTL:       time.Second,
		CacheMaxEntries: 10,
		RateLimitRPS:   10,
		RateLimitBurst: 5,
		RateLimitTTL:   time.Minute,
	}
	r := NewRouter(cfg, nil)

	req := httptest.NewRequest(http.MethodOptions, "/api/resolve", nil)
	req.Header.Set("Origin", "http://example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for preflight, got %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://example.com" {
		t.Fatalf("ACAO not set correctly: %q", got)
	}
}