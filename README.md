# dnsprop

DNS propagation checker — query many public resolvers worldwide and see when your DNS changes have propagated.

## Features
- Query multiple record types: A, AAAA, CNAME, TXT, MX, NS, SOA
- Parallel resolver queries with per‑resolver latency and TTLs
- Optional DNSSEC, DNS over UDP/TCP, and DoH (future)
- Caching and rate limiting to protect upstreams
- Clean React UI, Go API, deployable on Railway

## Tech stack
- Frontend: React + Vite + TypeScript
- Backend: Go (chi or fiber), `miekg/dns` for DNS, `slog`/`zerolog` for logs
- Packaging: Monorepo (web + api)
- Deploy: Railway (two services: `web`, `api`)

## Repository layout (proposed)
```
/ (repo root)
├─ web/                # React app (Vite, TS)
├─ api/                # Go service (HTTP API)
├─ docs/               # Architecture, ADRs, API schema
├─ .github/            # CI workflows (optional)
└─ railway.toml        # Monorepo services (optional)
```

## Local development
Prereqs: Go 1.22+, Node 20+, pnpm or npm, curl.

1) Clone and bootstrap (after scaffolding web/ and api/):
```
# Backend
cp api/.env.example api/.env   # edit as needed

# Frontend
cp web/.env.example web/.env.local  # set VITE_API_BASE_URL=http://localhost:8080
```
2) Run services (typical):
```
# Backend (from repo root or api/)
go run ./api/cmd/server

# Frontend (from web/)
pnpm dev   # or: npm run dev
```
Backend default: http://localhost:8080  •  Frontend default: http://localhost:5173

### Environment variables
Backend (`api/.env`):
- PORT=8080
- LOG_LEVEL=info
- CORS_ORIGINS=http://localhost:5173
- RESOLVERS=1.1.1.1,8.8.8.8,9.9.9.9,208.67.222.222
- REQUEST_TIMEOUT=2s
- CACHE_TTL=30s
- CACHE_MAX_ENTRIES=5000
- ENABLE_DNSSEC=false
- METRICS_ADDR=:9090

Frontend (`web/.env.local`):
- VITE_API_BASE_URL=http://localhost:8080

## HTTP API (draft)
- POST /api/resolve
  Request:
  ```json
  {
    "name": "example.com",
    "type": "A",
    "servers": ["1.1.1.1", "8.8.8.8"],
    "dnssec": false
  }
  ```
  Response:
  ```json
  {
    "name": "example.com",
    "type": "A",
    "results": [
      {
        "server": "1.1.1.1",
        "region": "Global/Cloudflare",
        "status": "ok",
        "rtt_ms": 12.4,
        "answers": [ {"value": "93.184.216.34", "ttl": 300} ],
        "authority": ["ns1.example.net."],
        "when": "2025-11-01T20:00:00Z"
      }
    ]
  }
  ```
- GET /api/healthz → 200 OK

Example curl:
```
curl -s localhost:8080/api/resolve \
  -H 'content-type: application/json' \
  -d '{"name":"example.com","type":"A"}' | jq
```

## Deploying on Railway
Two services in one repo: `api` (Go) and `web` (React).

Option A — railway.toml (recommended monorepo):
```toml
# railway.toml
[environments]
  [environments.production]

[services.api]
  root = "api"
  start = "./dnsprop-api"
  build = "go build -o dnsprop-api ./cmd/server"
  env = ["PORT", "LOG_LEVEL", "CORS_ORIGINS", "RESOLVERS", "REQUEST_TIMEOUT", "CACHE_TTL", "CACHE_MAX_ENTRIES", "ENABLE_DNSSEC"]

[services.web]
  root = "web"
  start = "pnpm preview --host 0.0.0.0 --port $PORT"
  build = "pnpm i --frozen-lockfile && pnpm build"
  env = ["VITE_API_BASE_URL"]
```
Set variables in Railway:
- api: PORT (auto), CORS_ORIGINS=https://your-web.onrailway.app, RESOLVERS=1.1.1.1,8.8.8.8,9.9.9.9
- web: PORT (auto), VITE_API_BASE_URL=https://your-api.up.railway.app

Option B — create two services in dashboard, set the same build/start commands and env vars.

## Roadmap
- Streaming results (SSE/WebSocket) as resolvers finish
- DNS over HTTPS support and per‑region resolver pools
- History/persistence of checks (optional DB)
- Export metrics (Prometheus) and tracing (OTel)

## Links
- See architecture details in `docs/ARCHITECTURE.md`.

## License
MIT
