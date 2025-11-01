# Simple commands for local development
.PHONY: api dev build test fmt vet lint tidy tools web-install web-env web-dev web-build web-preview int-test smoke

# Base URL for API (used by smoke tests)
API_BASE ?= http://localhost:8080

# Run the API server once (no hot reload)
api:
	go -C api run ./cmd/server

# Hot reload with Air (install via `make tools`)
dev:
	air -c api/.air.toml

# Build API binary to bin/
build:
	mkdir -p bin
	go -C api build -o ../bin/dnsprop-api ./cmd/server

# Go tests
test:
	go -C api test ./...

# Format, vet, lint
fmt:
	gofmt -s -w api

vet:
	go -C api vet ./...

lint: fmt vet

# Update go.mod/go.sum
tidy:
	go -C api mod tidy

# Install dev tools
tools:
	go install github.com/air-verse/air@latest

# --- Web (Vite) ---
web-install:
	npm --prefix web install

web-env:
	@[ -f web/.env.local ] || cp web/.env.example web/.env.local

web-dev: web-install web-env
	npm --prefix web run dev

web-build: web-install
	npm --prefix web run build

web-preview: web-install
	npm --prefix web run preview

# Integration tests (network required)
int-test:
	go -C api test -tags=integration ./...

# Smoke test against a running API (local or deployed)
smoke:
	@echo "Pinging $(API_BASE)/api/healthz"
	@curl -fsS $(API_BASE)/api/healthz && echo
	@echo "Probing $(API_BASE)/api/readyz"
	@curl -fsS $(API_BASE)/api/readyz && echo
	@echo "Resolve example.com A"
	@curl -fsS -H 'content-type: application/json' -d '{"name":"example.com","type":"A"}' $(API_BASE)/api/resolve | head -c 400 ; echo
