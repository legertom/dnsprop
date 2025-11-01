package ratelimit

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLimiterMiddleware_BlocksExcess(t *testing.T) {
	mw := LimiterMiddleware(1, 1, time.Minute) // 1 rps, burst 1
	allowedCount := 0
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowedCount++
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.1:5555"

	// First request allowed
	w1 := httptest.NewRecorder()
	h.ServeHTTP(w1, req)
	if w1.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w1.Code)
	}

	// Immediate second should be 429 due to burst=1
	w2 := httptest.NewRecorder()
	h.ServeHTTP(w2, req)
	if w2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w2.Code)
	}

	// After ~1s, token should refill
	time.Sleep(1100 * time.Millisecond)
	w3 := httptest.NewRecorder()
	h.ServeHTTP(w3, req)
	if w3.Code != http.StatusOK {
		t.Fatalf("expected 200 after refill, got %d", w3.Code)
	}

	if allowedCount != 2 {
		t.Fatalf("expected 2 allowed calls, got %d", allowedCount)
	}
}

func TestLimiterMiddleware_UsesXForwardedFor(t *testing.T) {
	mw := LimiterMiddleware(1, 1, time.Minute)
	var seenIPs []string
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenIPs = append(seenIPs, r.Header.Get("X-Forwarded-For"))
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-For", "198.51.100.7")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if len(seenIPs) != 1 || seenIPs[0] != "198.51.100.7" {
		t.Fatalf("middleware didn't preserve XFF context")
	}
}