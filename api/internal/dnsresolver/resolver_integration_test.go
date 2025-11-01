//go:build integration
// +build integration

package dnsresolver

import (
	"context"
	"testing"
	"time"
)

// Integration tests that exercise real public resolvers. Disabled by default.
// Run with: go test -tags=integration ./internal/dnsresolver -run Integration

func TestIntegration_Resolve_A_ExampleCom(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	servers := []string{"1.1.1.1", "8.8.8.8"}
	results := Resolve(ctx, "example.com", "A", servers, false, 2*time.Second, nil, 0)
	if len(results) == 0 {
		t.Skip("no results; likely no network access")
	}
	okCount := 0
	timeoutOnly := true
	for _, r := range results {
		if r.Status != "timeout" {
			timeoutOnly = false
		}
		if r.Status == "ok" && len(r.Answers) > 0 {
			okCount++
		}
	}
	if timeoutOnly {
		t.Skip("network timeouts only; skipping in offline environment")
	}
	if okCount == 0 {
		t.Fatalf("expected at least one ok response with answers, got: %#v", results)
	}
}

func TestIntegration_Resolve_NXDOMAIN_InvalidTLD(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	servers := []string{"1.1.1.1", "8.8.8.8"}
	results := Resolve(ctx, "does-not-exist.invalid", "A", servers, false, 2*time.Second, nil, 0)
	if len(results) == 0 {
		t.Skip("no results; likely no network access")
	}
	haveNonTimeout := false
	haveNX := false
	for _, r := range results {
		if r.Status != "timeout" {
			haveNonTimeout = true
		}
		if r.Status == "nxdomain" {
			haveNX = true
		}
	}
	if !haveNonTimeout {
		t.Skip("network timeouts only; skipping in offline environment")
	}
	if !haveNX {
		t.Fatalf("expected at least one NXDOMAIN response, got: %#v", results)
	}
}