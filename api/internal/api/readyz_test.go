package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/legertom/dnsprop/api/internal/config"
)

func TestReadyz_Degraded(t *testing.T) {
	cfg := &config.Config{
		Port:            "8080",
		LogLevel:        "info",
		CorsOrigins:     []string{"http://localhost"},
		Resolvers:       []string{"203.0.113.1", "203.0.113.2", "203.0.113.3"}, // TEST-NET addresses (no DNS)
		RequestTimeout:  300 * time.Millisecond,
		EnableDNSSEC:    false,
		CacheTTL:        100 * time.Millisecond,
		CacheMaxEntries: 10,
		RateLimitRPS:    100,
		RateLimitBurst:  100,
		RateLimitTTL:    time.Minute,
	}
	h := ReadyzHandler(cfg, nil)
	r := httptest.NewRequest(http.MethodGet, "/api/readyz", nil)
	w := httptest.NewRecorder()

	h.ServeHTTP(w, r)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when no resolvers respond, got %d", w.Code)
	}
	var out map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if out["status"] != "degraded" {
		t.Fatalf("expected status=degraded, got %v", out)
	}
}