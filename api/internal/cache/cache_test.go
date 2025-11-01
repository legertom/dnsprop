package cache

import (
	"testing"
	"time"

	resolver "github.com/legertom/dnsprop/api/internal/dnsresolver"
)

func TestLRU_AddGet(t *testing.T) {
	c, err := NewLRU(10, time.Minute)
	if err != nil { t.Fatalf("NewLRU: %v", err) }
	key := "k|example.com|A|dnssec=0"
	val := resolver.Result{Server: "8.8.8.8"}
	c.Add(key, val, 10*time.Second)
	if got, ok := c.Get(key); !ok || got.Server != "8.8.8.8" {
		t.Fatalf("Get failed: ok=%v val=%+v", ok, got)
	}
}

func TestLRU_Expiry(t *testing.T) {
	c, err := NewLRU(10, 20*time.Millisecond)
	if err != nil { t.Fatalf("NewLRU: %v", err) }
	key := "k|example.com|A|dnssec=0"
	c.Add(key, resolver.Result{Server: "1.1.1.1"}, 5*time.Millisecond)
	time.Sleep(35 * time.Millisecond)
	if _, ok := c.Get(key); ok {
		t.Fatalf("expected entry to expire")
	}
}