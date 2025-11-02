package config

import (
	"fmt"
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
	cfg.Resolvers = splitAndTrim(getenv("RESOLVERS", "1.1.1.1,1.0.0.1,8.8.8.8,8.8.4.4,9.9.9.9,149.112.112.112,208.67.222.222,208.67.220.220,156.154.70.1,156.154.71.1,4.2.2.1,4.2.2.2,76.76.2.0,76.76.10.0,94.140.14.14,94.140.15.15,185.228.168.9,185.228.169.9,77.88.8.8,77.88.8.1,114.114.114.114,114.114.115.115,223.5.5.5,223.6.6.6,119.29.29.29,168.95.1.1,168.95.192.1,1.1.1.2,1.0.0.2,200.221.11.100"), ",")
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

// Validate performs sanity checks on loaded configuration.
func (c *Config) Validate() error {
	if len(c.CorsOrigins) == 0 {
		return fmt.Errorf("CORS_ORIGINS must not be empty")
	}
	if len(c.Resolvers) == 0 {
		return fmt.Errorf("RESOLVERS must not be empty")
	}
	if c.RequestTimeout <= 0 {
		return fmt.Errorf("REQUEST_TIMEOUT must be > 0")
	}
	if c.CacheTTL <= 0 {
		return fmt.Errorf("CACHE_TTL must be > 0")
	}
	if c.CacheMaxEntries <= 0 {
		return fmt.Errorf("CACHE_MAX_ENTRIES must be > 0")
	}
	if c.RateLimitRPS <= 0 {
		return fmt.Errorf("RATE_LIMIT_RPS must be > 0")
	}
	if c.RateLimitBurst <= 0 {
		return fmt.Errorf("RATE_LIMIT_BURST must be > 0")
	}
	if c.RateLimitTTL <= 0 {
		return fmt.Errorf("RATE_LIMIT_TTL must be > 0")
	}
	return nil
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
