package cache

import (
	"time"

	expirable "github.com/hashicorp/golang-lru/v2/expirable"
	resolver "github.com/legertom/dnsprop/api/internal/dnsresolver"
)

// LRUCache implements dnsresolver.Cache using an expirable LRU.
// It is safe for concurrent use.
type LRUCache struct {
	l *expirable.LRU[string, resolver.Result]
	// defaultTTL is used only if a caller passes ttl<=0; callers should normally pass a per-entry ttl.
	defaultTTL time.Duration
}

func NewLRU(maxEntries int, defaultTTL time.Duration) (*LRUCache, error) {
	lru := expirable.NewLRU[string, resolver.Result](maxEntries, nil, defaultTTL)
	return &LRUCache{l: lru, defaultTTL: defaultTTL}, nil
}

func (c *LRUCache) Get(key string) (resolver.Result, bool) {
	if c == nil || c.l == nil {
		return resolver.Result{}, false
	}
	v, ok := c.l.Get(key)
	return v, ok
}

func (c *LRUCache) Add(key string, val resolver.Result, ttl time.Duration) {
	if c == nil || c.l == nil {
		return
	}
	if ttl <= 0 {
		ttl = c.defaultTTL
	}
	// Library uses default TTL per cache; per-entry TTL is enforced by resolver when reading.
	_ = ttl
	c.l.Add(key, val)
}
