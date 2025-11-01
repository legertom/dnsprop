package dnsresolver

import (
	"testing"
	"time"

	"github.com/miekg/dns"
)

func TestMapType(t *testing.T) {
	if mapType("A") == 0 || mapType("AAAA") == 0 || mapType("MX") == 0 {
		t.Fatalf("expected known types to map")
	}
	if mapType("PTR") != 0 {
		t.Fatalf("expected PTR to be unsupported (0)")
	}
}

func TestNormalizeAndRegion(t *testing.T) {
	if got := normalizeServer("8.8.8.8:53"); got != "8.8.8.8" {
		t.Fatalf("normalizeServer: got %q", got)
	}
	if got := regionFor("1.1.1.1"); got == "" {
		t.Fatalf("regionFor cloudflare should be labeled, got empty")
	}
	if got := regionFor("203.0.113.1"); got != "" {
		t.Fatalf("regionFor unknown should be empty, got %q", got)
	}
}

func TestCacheKey(t *testing.T) {
	k1 := cacheKey("Example.COM", "a", "8.8.8.8:53", true)
	k2 := cacheKey("example.com", "A", "8.8.8.8", true)
	if k1 != k2 {
		t.Fatalf("cacheKey normalization mismatch: %q vs %q", k1, k2)
	}
}

func TestMinAnswerTTL(t *testing.T) {
	ans := []Answer{{TTL: 300}, {TTL: 120}, {TTL: 600}}
	if got := minAnswerTTL(ans); got != 120*time.Second {
		t.Fatalf("minAnswerTTL got %v", got)
	}
}

func TestNegativeTTLFromNs_Default(t *testing.T) {
	if got := negativeTTLFromNs(nil); got != 30*time.Second {
		t.Fatalf("expected default 30s, got %v", got)
	}
}

func TestNegativeTTLFromNs_FromSOA(t *testing.T) {
	soa := &dns.SOA{Minttl: 45}
	if got := negativeTTLFromNs([]dns.RR{soa}); got != 45*time.Second {
		t.Fatalf("expected 45s, got %v", got)
	}
}

func TestExtractNames(t *testing.T) {
	rr, err := dns.NewRR("example.com. 60 IN NS ns1.example.com.")
	if err != nil { t.Fatalf("NewRR: %v", err) }
	ns := extractNames([]dns.RR{rr})
	if len(ns) != 1 || ns[0] != "example.com." {
		t.Fatalf("unexpected extractNames: %#v", ns)
	}
}