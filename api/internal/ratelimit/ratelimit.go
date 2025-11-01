package ratelimit

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// LimiterMiddleware returns a per-IP token bucket rate limiting middleware.
// rps: tokens added per second; burst: bucket capacity; ttl: idle time before a client's limiter is evicted.
func LimiterMiddleware(rps float64, burst int, ttl time.Duration) func(http.Handler) http.Handler {
	type client struct {
		lim      *rate.Limiter
		lastSeen time.Time
	}

	var (
		mu      sync.Mutex
		clients = make(map[string]*client)
	)

	// background cleanup
	go func() {
		cleanupInterval := ttl
		if cleanupInterval < time.Minute {
			cleanupInterval = time.Minute
		}
		for {
			time.Sleep(cleanupInterval)
			mu.Lock()
			cut := time.Now().Add(-ttl)
			for ip, c := range clients {
				if c.lastSeen.Before(cut) {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	getLimiter := func(ip string) *rate.Limiter {
		mu.Lock()
		defer mu.Unlock()
		if c, ok := clients[ip]; ok {
			c.lastSeen = time.Now()
			return c.lim
		}
		lim := rate.NewLimiter(rate.Limit(rps), burst)
		clients[ip] = &client{lim: lim, lastSeen: time.Now()}
		return lim
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			if ip == "" {
				ip = "unknown"
			}
			lim := getLimiter(ip)
			if !lim.Allow() {
				w.Header().Set("Retry-After", "1")
				http.Error(w, "rate limited", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	// X-Forwarded-For: first is original client
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	if xr := r.Header.Get("X-Real-IP"); xr != "" {
		return xr
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}
