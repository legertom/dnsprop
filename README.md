# wtfdns

DNS propagation checker — query many public resolvers worldwide and see when your DNS changes have propagated.

**Live at:** [https://wtfdns.lol](https://wtfdns.lol) • **GitHub:** [https://github.com/legertom/dnsprop](https://github.com/legertom/dnsprop)

## Features

### DNS Querying
- **7 supported record types**: A, AAAA, CNAME, TXT, MX, NS, SOA
- **30+ global DNS resolvers** across 5 continents by default
- **Parallel queries** to all resolvers simultaneously for fast results
- **Custom resolver support** - specify up to 50 custom DNS servers per query
- **DNSSEC validation** - optional DNSSEC checking with DO flag support
- **Automatic TCP fallback** - retries over TCP if UDP response is truncated
- **Per-resolver metrics**: Round-trip time (RTT) and TTL for each answer

### Propagation Analysis
- **Propagation statistics**: Total servers, successful responses, propagation percentage
- **Answer group detection**: Automatically groups servers by identical answers
- **Visual propagation status**: "Fully Propagated" vs "Mixed Results" indicators
- **Color-coded results**: Table rows and map markers colored by answer groups
- **Detailed breakdown**: Shows count of servers per answer group

### Interactive Map Visualization
- **Global server map** with geographic markers for all resolvers
- **Color-coded markers** matching answer groups in the table
- **Interactive tooltips** on hover showing server, region, status, RTT, and answers
- **Zoomable map** with pan controls
- **Status-based colors** when answer grouping isn't available

### Results Table
- **Sortable columns**: Server name, status, and RTT
- **Status badges**: Visual indicators for ok, error, timeout, nxdomain, servfail, noanswer
- **Color-coded rows**: Matched to answer groups for easy pattern recognition
- **Answer display**: Shows all answers with individual TTLs
- **Authority servers**: Displays authoritative nameservers when available

### Export & Sharing
- **JSON export**: Download complete results as structured JSON
- **CSV export**: Download results in spreadsheet-friendly format
- **Timestamp included**: All exports include query timestamps

### User Interface
- **Modern design**: Glassmorphism UI with animated background elements
- **Dark mode**: System-aware theme toggle with localStorage persistence
- **Responsive layout**: Works on desktop, tablet, and mobile devices
- **Real-time feedback**: Loading states, error messages, and status updates

### Backend Features
- **Response caching**: LRU cache with configurable TTL (default 30s)
- **Rate limiting**: Per-IP token bucket rate limiting (default 1 RPS, burst 5)
- **Request validation**: Validates domain names, record types, and server addresses
- **Health checks**: `/api/healthz` for basic health, `/api/readyz` for readiness
- **Structured logging**: JSON-formatted logs with request IDs
- **CORS support**: Configurable allowed origins
- **Geographic data**: Region and coordinates for resolvers

## Tech stack
- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS, react-simple-maps
- **Backend**: Go 1.22+, Chi router, `miekg/dns` library, structured logging with `slog`
- **Packaging**: Monorepo structure (web + api)
- **Deploy**: Railway (two services: `web`, `api`)
- **DNS Protocol**: UDP with automatic TCP fallback, EDNS0 support, DNSSEC capability

## Repository layout
```
/ (repo root)
├─ web/                          # React app (Vite, TS)
├─ api/                          # Go service (HTTP API)
├─ docs/                         # Documentation
│  ├─ ARCHITECTURE.md            # Architecture details
│  ├─ INSTRUCTIONS.md            # Development instructions
│  ├─ TODO.md                    # TODO checklist
│  ├─ QUICKSTART.md              # Quick start guide
│  ├─ COMPLETED_WORK.md          # Completed work log
│  ├─ deployment/                # Deployment docs
│  │  ├─ RAILWAY_DEPLOYMENT.md   # Railway deployment guide
│  │  └─ RAILWAY_SUMMARY.txt     # Railway summary
│  └─ sessions/                  # Session summaries
│     ├─ SESSION_LOG.md          # Session logs
│     └─ SESSION_*.md            # Individual session summaries
├─ .github/                      # CI workflows (optional)
└─ railway.toml                 # Monorepo services
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
- `PORT=8080` - Server port (Railway auto-injects)
- `LOG_LEVEL=info` - Logging level (debug, info, warn, error)
- `CORS_ORIGINS=http://localhost:5173` - Allowed CORS origins (comma-separated)
- `RESOLVERS=1.1.1.1,8.8.8.8,...` - DNS resolver list (30+ by default)
- `REQUEST_TIMEOUT=2s` - Maximum request timeout
- `CACHE_TTL=30s` - Cache entry TTL
- `CACHE_MAX_ENTRIES=5000` - Maximum cache entries
- `ENABLE_DNSSEC=false` - Enable DNSSEC globally (can also be per-request)
- `RATE_LIMIT_RPS=1.0` - Rate limit requests per second per IP
- `RATE_LIMIT_BURST=5` - Rate limit burst capacity
- `RATE_LIMIT_TTL=10m` - Rate limit client TTL

Frontend (`web/.env.local`):
- VITE_API_BASE_URL=http://localhost:8080

## HTTP API

### POST /api/resolve
Query DNS records across multiple resolvers.

**Request:**
```json
{
  "name": "example.com",
  "type": "A",
  "servers": ["1.1.1.1", "8.8.8.8"],  // Optional: defaults to configured resolvers
  "dnssec": false  // Optional: enable DNSSEC validation
}
```

**Response:**
```json
{
  "name": "example.com",
  "type": "A",
  "results": [
    {
      "server": "1.1.1.1",
      "region": "Global/Cloudflare",
      "latitude": -37.7,
      "longitude": 145.1833,
      "status": "ok",
      "rtt_ms": 12.4,
      "answers": [
        {"value": "93.184.216.34", "ttl": 300}
      ],
      "authority": ["ns1.example.net."],
      "when": "2025-11-01T20:00:00Z"
    }
  ]
}
```

**Status values**: `ok`, `error`, `timeout`, `nxdomain`, `servfail`, `noanswer`

### GET /api/healthz
Basic health check. Always returns 200 OK.

### GET /api/readyz
Readiness check. Probes a subset of resolvers and returns:
- **200 OK**: At least one resolver is responding
- **503 Service Unavailable**: All probed resolvers are failing

**Response:**
```json
{
  "status": "ok"  // or "degraded"
}
```

Example curl:
```
curl -s localhost:8080/api/resolve \
  -H 'content-type: application/json' \
  -d '{"name":"example.com","type":"A"}' | jq
```

## Testing

### Unit tests
- Backend: `make test` or `go -C api test ./...`

### Integration tests (network)
- Resolver integration tests are behind the `integration` build tag.
- Run: `make int-test` or `go -C api test -tags=integration ./internal/dnsresolver -run Integration`
- Tests skip if offline (all upstream timeouts).

### Smoke test (local or Railway)
- Run against a base URL (defaults to localhost):
  - `make smoke` (local) or `make smoke API_BASE=https://your-api.up.railway.app`

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

Health checks
- Configure the API service health check path to `/api/readyz` in Railway so deploys wait for resolver sanity to pass.
- `/api/healthz` always returns 200; `/api/readyz` probes a few resolvers and returns 200 or 503.

Option B — create two services in dashboard, set the same build/start commands and env vars.

## Roadmap
- Streaming results (SSE/WebSocket) as resolvers finish
- DNS over HTTPS support and per‑region resolver pools
- History/persistence of checks (optional DB)
- Export metrics (Prometheus) and tracing (OTel)

## Development Status

This project is **~90% complete** and **production-ready**. For detailed development instructions, progress tracking, and completion roadmap, see **[docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md)**.

**Current Status:**
- ✅ **Backend API**: ~95% complete - All core features implemented, production-ready
- ✅ **Frontend UI**: ~90% complete - Modern design with wtfdns branding, fully functional
- ✅ **DNS Features**: All record types supported, DNSSEC enabled, 30+ resolvers configured
- ✅ **Visualization**: Interactive map with color-coded markers and tooltips
- ✅ **Deployment**: Successfully deployed on Railway with custom domain (wtfdns.lol)

**What's Working:**
- Parallel DNS queries across 30+ global resolvers
- Propagation analysis with answer group detection
- Interactive map visualization
- Export functionality (JSON/CSV)
- Dark mode and responsive design
- Rate limiting and caching
- Health and readiness checks

**Future Enhancements:**
- Streaming results (SSE/WebSocket) as resolvers finish
- DNS over HTTPS (DoH) support
- Per-region resolver pools
- Query history and persistence
- Metrics export (Prometheus) and tracing

## Documentation

- **Development Instructions:** [`docs/INSTRUCTIONS.md`](docs/INSTRUCTIONS.md) ⭐ **Start here!**
- **Quick TODO Checklist:** [`docs/TODO.md`](docs/TODO.md) 📋 **Quick reference**
- **Quick Start Guide:** [`docs/QUICKSTART.md`](docs/QUICKSTART.md)
- **Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Railway Deployment:** [`docs/deployment/RAILWAY_DEPLOYMENT.md`](docs/deployment/RAILWAY_DEPLOYMENT.md)
- **Session Logs:** [`docs/sessions/SESSION_LOG.md`](docs/sessions/SESSION_LOG.md)

## License
MIT
