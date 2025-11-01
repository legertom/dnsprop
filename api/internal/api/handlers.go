package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/legertom/dnsprop/api/internal/config"
	resolver "github.com/legertom/dnsprop/api/internal/dnsresolver"
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

func ResolveHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		req.Type = strings.ToUpper(strings.TrimSpace(req.Type))
		if req.Name == "" || req.Type == "" {
			http.Error(w, "name and type required", http.StatusBadRequest)
			return
		}
		if len(req.Servers) == 0 {
			req.Servers = cfg.Resolvers
		}
		servers := dedupe(req.Servers)
		if len(servers) == 0 {
			http.Error(w, "no resolvers configured", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), cfg.RequestTimeout)
		defer cancel()

		results := resolver.Resolve(ctx, req.Name, req.Type, servers, req.DNSSEC, cfg.RequestTimeout)

		out := ResolveResponse{Name: req.Name, Type: req.Type, Results: make([]Result, 0, len(results))}
		for _, rr := range results {
			res := Result{
				Server: rr.Server,
				Region: rr.Region,
				Status: rr.Status,
				RTTMs:  rr.RTTMs,
				When:   rr.When.UTC().Format(time.RFC3339),
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
