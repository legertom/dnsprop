package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/legertom/dnsprop/api/internal/config"
	resolver "github.com/legertom/dnsprop/api/internal/dnsresolver"
	"github.com/legertom/dnsprop/api/internal/validation"
)

type ResolveRequest struct {
	Name    string   `json:"name"`
	Type    string   `json:"type"`
	Servers []string `json:"servers,omitempty"`
	DNSSEC  bool     `json:"dnssec,omitempty"`
}

type Answer struct {
	Value string `json:"value"`
	TTL   uint32 `json:"ttl,omitempty"`
}

type Result struct {
	Server    string   `json:"server"`
	Region    string   `json:"region,omitempty"`
	Latitude  float64  `json:"latitude"`
	Longitude float64  `json:"longitude"`
	Status    string   `json:"status"`
	RTTMs     float64  `json:"rtt_ms,omitempty"`
	Answers   []Answer `json:"answers,omitempty"`
	Authority []string `json:"authority,omitempty"`
	When      string   `json:"when"`
}

type ResolveResponse struct {
	Name    string   `json:"name"`
	Type    string   `json:"type"`
	Results []Result `json:"results"`
}

func Healthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

// ReadyzHandler performs a lightweight resolver sanity check.
// It queries a small subset of resolvers with a tight timeout and returns 200 if any responds.
func ReadyzHandler(cfg *config.Config, cache resolver.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		servers := cfg.Resolvers
		if len(servers) > 3 {
			servers = servers[:3]
		}
		ctx, cancel := context.WithTimeout(r.Context(), minDuration(500*time.Millisecond, cfg.RequestTimeout))
		defer cancel()
		results := resolver.Resolve(ctx, "example.com", "A", servers, false, 400*time.Millisecond, cache, 0)
		ok := false
		for _, res := range results {
			if res.Status != "error" && res.Status != "timeout" {
				ok = true
				break
			}
		}
		w.Header().Set("content-type", "application/json")
		if ok {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{"status": "ok"})
			return
		}
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]any{"status": "degraded"})
	}
}

func minDuration(a, b time.Duration) time.Duration {
	if a < b {
		return a
	}
	return b
}

func ResolveHandler(cfg *config.Config, cache resolver.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		// Validate and normalize domain name
		var err error
		req.Name, err = validation.ValidateDomainName(req.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Validate record type
		req.Type = strings.ToUpper(strings.TrimSpace(req.Type))
		if err := validation.ValidateRecordType(req.Type); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if len(req.Servers) == 0 {
			req.Servers = cfg.Resolvers
		}

		// Validate custom servers if provided
		if len(req.Servers) > 0 {
			if err := validation.ValidateServers(req.Servers, 50); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}

		servers := dedupe(req.Servers)
		if len(servers) == 0 {
			http.Error(w, "no resolvers configured", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), cfg.RequestTimeout)
		defer cancel()

		results := resolver.Resolve(ctx, req.Name, req.Type, servers, req.DNSSEC, cfg.RequestTimeout, cache, cfg.CacheTTL)

		out := ResolveResponse{Name: req.Name, Type: req.Type, Results: make([]Result, 0, len(results))}
		for _, rr := range results {
			res := Result{
				Server:    rr.Server,
				Region:    rr.Region,
				Latitude:  rr.Latitude,
				Longitude: rr.Longitude,
				Status:    rr.Status,
				RTTMs:     rr.RTTMs,
				When:      rr.When.UTC().Format(time.RFC3339),
			}
			if len(rr.Answers) > 0 {
				ans := make([]Answer, 0, len(rr.Answers))
				for _, a := range rr.Answers {
					ans = append(ans, Answer{Value: a.Value, TTL: a.TTL})
				}
				res.Answers = ans
			}
			if len(rr.Authority) > 0 {
				res.Authority = rr.Authority
			}
			out.Results = append(out.Results, res)
		}

		w.Header().Set("content-type", "application/json")
		json.NewEncoder(w).Encode(out)
	}
}

func dedupe(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}
