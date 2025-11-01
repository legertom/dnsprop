# dnsprop Architecture

This document describes the initial architecture for dnsprop, a DNS propagation checker with a React frontend and a Go backend deployed on Railway.

## Goals
- Fast propagation checks across many public DNS resolvers
- Clear, lightweight API for the web app
- Safe defaults: timeouts, rate limiting, and caching
- Easy to deploy (Railway) and iterate (local dev)

Non‑goals (initially)
- Persistent user accounts/history
- Authoritative DNS functionality
- Private/recursive resolver management

## High‑level view

- web (React + Vite + TS)
  - UI to enter domain + record type, display per‑resolver results
  - Calls the Go API, renders results (polling first; SSE/WebSocket later)

- api (Go)
  - REST endpoints to trigger DNS queries
  - Resolver engine querying many public resolvers concurrently
  - Normalization, deduplication, and aggregation
  - In‑memory caching, per‑client rate limiting, metrics/health

- Railway deployment
  - Two services: `web` and `api`
  - Stateless; no database initially

## Data flow
1) User requests a check for `name` + `type` (+ optional custom resolver list)
2) API validates inputs, builds a query plan (resolver targets)
3) Resolver engine fans out queries concurrently with deadlines/timeouts
4) Responses are normalized into a common shape (answers, TTLs, status, rtt)
5) Aggregate, dedupe, and compute a summary (e.g., percentage propagation)
6) Return JSON (initially), or stream partial results as they complete (future)

## API (initial)
- POST /api/resolve
  - Request: `{ name: string, type: "A"|"AAAA"|"CNAME"|"TXT"|"MX"|"NS"|"SOA", servers?: string[], dnssec?: boolean }`
  - Response: `{ name, type, results: Array<{ server, region?, status, rtt_ms, answers?, authority?, when }> }`
- GET /api/healthz → `200 OK`
- (Future) GET /api/resolve/stream?name=…&type=… → SSE stream of partial results

Notes
- `servers` omitted → use default pool (curated public resolvers)
- `status` ∈ { ok, nxdomain, noanswer, servfail, timeout, error }

## Resolver engine
- Library: `miekg/dns` (UDP default; fallback to TCP on truncation)
- EDNS0 with reasonable UDP size (e.g., 1232 bytes)
- Set DO flag when `dnssec=true`; otherwise unset
- Disable ECS by default (no client subnet) to reduce variance
- Timeout per query (e.g., 2s); global request timeout (context deadline)
- Retry: none by default (avoid upstream abuse); may add sparse retry later
- Concurrency: bounded worker pool sized to `min(len(resolvers), N)`

### Resolver pools
- Default set of public resolvers (Cloudflare, Google, Quad9, OpenDNS, ISP samples) with optional region metadata
- Pool selection strategy: shuffle, then take up to a max (e.g., 25) to bound cost
- Optional per‑region pools in future; e.g., `pool=global`, `pool=apac`, etc.

## Result normalization
- Normalize per type:
  - A/AAAA: list of IPs with TTL
  - CNAME: canonical target with TTL
  - TXT: string values (sorted)
  - MX: preference + exchange
  - NS: nameservers
  - SOA: mname, rname, serial, minimum, etc.
- Include `authority` section when available (useful for NXDOMAIN/SERVFAIL debugging)
- Compute a stable `answer_hash` per result for straightforward comparisons in UI

## Caching
- In‑memory LRU keyed by `(name, type, server, dnssec)`
- TTL = `min(min(answer.ttl), CACHE_TTL)`; for negative answers, use SOA.MINIMUM or a small cap (e.g., 30s)
- Cache protects both upstreams and our infra; opt‑out may be added later

## Rate limiting
- Token bucket per client IP (e.g., 1 rps, burst 5) to deter abuse
- Soft global concurrency limit to avoid exhausting file descriptors/egress
- Optional per‑upstream rate limit if needed

## Security
- Strict input validation: name length, label count, allowed chars (IDNA via punycode)
- CORS restricted to configured origins
- DoH (future) will use an allowlist of endpoints; no arbitrary URLs
- No dynamic resolver ports; UDP/TCP 53 only for classic DNS
- Sanitize logs; do not log raw resolver errors with PII

## Observability
- Structured logging (zerolog/slog) with request IDs; add per‑resolver spans
- Prometheus metrics (exposed on `METRICS_ADDR`):
  - `dnsprop_dns_queries_total{server,type,status}`
  - `dnsprop_dns_query_duration_seconds_bucket{server}`
  - `dnsprop_inflight_queries`
  - `dnsprop_rate_limited_total`
- Health endpoints: `/api/healthz`; readiness can validate resolver pool reachability with a fast head check (optional)

## Configuration
- See README for environment variables: PORT, LOG_LEVEL, CORS_ORIGINS, RESOLVERS, REQUEST_TIMEOUT, CACHE_TTL, CACHE_MAX_ENTRIES, ENABLE_DNSSEC, METRICS_ADDR
- Resolver list: comma‑separated IPv4/IPv6; names/regions kept in code or a JSON file (future)

## Deployment (Railway)
- Two services in a monorepo
  - api: build `go build -o dnsprop-api ./cmd/server`, start `./dnsprop-api`
  - web: build `pnpm build`, start `pnpm preview --host 0.0.0.0 --port $PORT`
- Set appropriate env vars per service (see README)
- Stateless; scale API horizontally if needed; cache is per‑instance

## Testing
- Unit tests for: input validation, normalization, cache behavior
- Integration tests: against a small, whitelisted resolver set with generous timeouts
- Optional snapshot tests of normalized responses; beware answer volatility
- Load test: bounded resolver count with synthetic names to validate concurrency limits

## Performance considerations
- Limit fan‑out (max resolvers per request)
- Prefer 1 UDP attempt + TCP fallback on TC bit rather than multiple UDP retries
- Tune timeouts conservatively (2s) and record per‑server RTT for UI
- Avoid per‑request memory growth via object pooling (optional) and slice reuse

## Edge cases
- CNAME chains/loops; handle up to a sane depth (e.g., 10)
- Mixed answers across resolvers (eventual consistency); UI should show divergence clearly
- NXDOMAIN vs NOERROR/NODATA; represent distinctly in `status`
- SERVFAIL on some resolvers; do not treat as fatal for the whole request
- Truncated UDP (TC=1) → automatic TCP retry
- DNSSEC: validation is not performed initially; we only set DO and return AD bit presence if available

## Future work
- Streaming results via SSE/WebSocket to show progress incrementally
- DNS over HTTPS (DoH) with resolver allowlist and per‑endpoint backoff
- Persistence layer for history (SQLite/Postgres) and sharing links
- Region‑aware resolver pools and filtering in UI
- Tracing (OpenTelemetry) with spans per upstream query

## Repository structure (proposed)
- `web/` React app (Vite, TS)
- `api/` Go service
  - `cmd/server/main.go` HTTP server
  - `internal/dns/` resolver engine (queries, normalization)
  - `internal/api/` handlers, validation, DTOs
  - `internal/cache/` LRU cache
  - `internal/ratelimit/` middleware
  - `pkg/` public helpers (if any)
- `docs/` this document and ADRs

## Open questions
- Which HTTP router (chi, fiber) and logger to standardize on?
- How big should default resolver pool be (latency vs cost)?
- Should we persist resolver RTT and error rates for quality scoring?
