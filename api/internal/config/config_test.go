package config

import (
	"testing"
	"time"
)

func TestValidate_Errors(t *testing.T) {
	c := &Config{
		Port:            "8080",
		LogLevel:        "info",
		CorsOrigins:     []string{"http://x"},
		Resolvers:       []string{"1.1.1.1"},
		RequestTimeout:  -1,
		EnableDNSSEC:    false,
		CacheTTL:        0,
		CacheMaxEntries: -1,
		RateLimitRPS:    0,
		RateLimitBurst:  0,
		RateLimitTTL:    0,
	}
	if err := c.Validate(); err == nil {
		t.Fatalf("expected validation error")
	}
}

func TestValidate_OK(t *testing.T) {
	c := &Config{
		Port:            "8080",
		LogLevel:        "info",
		CorsOrigins:     []string{"http://localhost"},
		Resolvers:       []string{"1.1.1.1", "8.8.8.8"},
		RequestTimeout:  time.Second,
		EnableDNSSEC:    false,
		CacheTTL:        time.Second,
		CacheMaxEntries: 10,
		RateLimitRPS:    1,
		RateLimitBurst:  1,
		RateLimitTTL:    time.Minute,
	}
	if err := c.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}