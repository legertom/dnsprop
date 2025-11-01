package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port            string
	LogLevel        string
	CorsOrigins     []string
	Resolvers       []string
	RequestTimeout  time.Duration
	EnableDNSSEC    bool
	CacheTTL        time.Duration
	CacheMaxEntries int
	RateLimitRPS    float64
	RateLimitBurst  int
	RateLimitTTL    time.Duration
}

func Load() (*Config, error) {
	cfg := &Config{}
	cfg.Port = getenv("PORT", "8080")
	cfg.LogLevel = getenv("LOG_LEVEL", "info")
	cfg.CorsOrigins = splitAndTrim(getenv("CORS_ORIGINS", "http://localhost:5173"), ",")
	cfg.Resolvers = splitAndTrim(getenv("RESOLVERS", "1.1.1.1,8.8.8.8,9.9.9.9,208.67.222.222"), ",")
	if d, err := time.ParseDuration(getenv("REQUEST_TIMEOUT", "2s")); err == nil {
		cfg.RequestTimeout = d
	} else {
		cfg.RequestTimeout = 2 * time.Second
	}
	cfg.EnableDNSSEC = strings.EqualFold(getenv("ENABLE_DNSSEC", "false"), "true")
	if d, err := time.ParseDuration(getenv("CACHE_TTL", "30s")); err == nil {
		cfg.CacheTTL = d
	} else {
		cfg.CacheTTL = 30 * time.Second
	}
	cfg.CacheMaxEntries = 5000
	if v := getenv("CACHE_MAX_ENTRIES", ""); v != "" {
		if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil && n > 0 {
			cfg.CacheMaxEntries = n
		}
	}

	// Rate limiting
	cfg.RateLimitRPS = 1.0
	if v := getenv("RATE_LIMIT_RPS", ""); v != "" {
		if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil && f > 0 {
			cfg.RateLimitRPS = f
		}
	}
	cfg.RateLimitBurst = 5
	if v := getenv("RATE_LIMIT_BURST", ""); v != "" {
		if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil && n > 0 {
			cfg.RateLimitBurst = n
		}
	}
	if d, err := time.ParseDuration(getenv("RATE_LIMIT_TTL", "10m")); err == nil {
		cfg.RateLimitTTL = d
	} else {
		cfg.RateLimitTTL = 10 * time.Minute
	}

	return cfg, nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func splitAndTrim(s, sep string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, sep)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
