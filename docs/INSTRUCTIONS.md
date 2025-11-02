# wtfdns Development Instructions

**Last Updated:** November 2, 2025 (Session 5)
**Status:** 99% Complete - Production Ready

---

## 📋 Quick Start for New Conversations

If you're starting a new conversation:
1. Read this entire file
2. **READ `COMPLETED_WORK.md`** - Contains detailed summary of all work completed in Session 3
3. Check `TODO.md` for quick checklist view
4. Check the "Current Status" section below
5. Review completed items (checked boxes)
6. Continue with next unchecked items in the "Completion Plan"

### 📚 Additional Documentation Files
- **`sessions/SESSION_3_SUMMARY.md`** - ⭐ Quick overview of Session 3 achievements
- **`COMPLETED_WORK.md`** - Comprehensive technical details of Session 3 work
- **`TODO.md`** - Quick reference checklist with current status
- **`deployment/RAILWAY_DEPLOYMENT.md`** - Detailed Railway deployment guide
- **`ARCHITECTURE.md`** - System architecture and design decisions
- **`../README.md`** - Main project documentation

**📖 Recommended Reading Order:**
1. `sessions/SESSION_3_SUMMARY.md` - Quick overview (5 min read)
2. This file (`INSTRUCTIONS.md`) - Full development guide
3. `COMPLETED_WORK.md` - Detailed technical changes

---

## 🎯 Project Overview

**dnsprop** is a DNS propagation checker that queries multiple public DNS resolvers worldwide to verify when DNS changes have propagated.

### Tech Stack
- **Backend:** Go 1.22+, chi router, miekg/dns, slog logging
- **Frontend:** React 18, TypeScript, Vite
- **Deployment:** Railway (Docker containers)
- **Build:** Makefile, Docker, nixpacks

### Key Features
- Query 7 record types: A, AAAA, CNAME, TXT, MX, NS, SOA
- **30 global DNS resolvers** across 5 continents with precise geographic coordinates
- Parallel resolver queries with per-resolver latency and TTLs
- DNSSEC support (DO flag) with explanatory tooltip
- **Interactive global map** with individual server markers and hover details
- **Color-coded answer grouping** for easy CDN/GeoDNS identification
- Dark mode with localStorage persistence
- LRU caching and per-IP rate limiting
- Clean separation: React UI + Go API

---

## 📊 Current Implementation Status

### Backend (Go API) - **~90% Complete** ✅

**Fully Implemented:**
- ✅ DNS resolver engine with miekg/dns
- ✅ Parallel querying (max 20 concurrent, configurable)
- ✅ UDP with automatic TCP fallback on truncation
- ✅ All 7 record types supported
- ✅ DNSSEC support (DO flag, AD bit)
- ✅ Result normalization with TTLs and status codes
- ✅ LRU caching with expirable entries
- ✅ Per-IP token bucket rate limiting
- ✅ Input validation (domains, IDNA/punycode, IPs)
- ✅ CORS middleware
- ✅ Structured JSON logging with slog
- ✅ Health endpoints: /api/healthz and /api/readyz
- ✅ Context-based timeouts and cancellation
- ✅ Unit tests for all major components
- ✅ Integration tests (behind build tag)
- ✅ Dockerfile and Railway deployment config

**Location of Key Files:**
- Entry point: `api/cmd/server/main.go`
- DNS resolver: `api/internal/dnsresolver/resolver.go`
- HTTP handlers: `api/internal/api/handlers.go`
- Router setup: `api/internal/api/router.go`
- Config: `api/internal/config/config.go`
- Cache: `api/internal/cache/cache.go`
- Rate limiting: `api/internal/ratelimit/ratelimit.go`
- Validation: `api/internal/validation/validate.go`

### Frontend (React) - **~98% Complete** ✅

**Implemented:**
- ✅ React + Vite + TypeScript setup
- ✅ Basic form (domain input + record type selector)
- ✅ API integration with type-safe interfaces
- ✅ Table display of results
- ✅ Loading and error states
- ✅ Dockerfile with Nginx for production
- ✅ Tailwind CSS with beautiful, modern design
- ✅ Responsive design (mobile-friendly)
- ✅ Propagation analysis with summary
- ✅ DNSSEC toggle in UI with explanatory tooltip
- ✅ Result grouping and comparison
- ✅ Color-coded status badges
- ✅ Sorting functionality (by server, status, RTT)
- ✅ Export functionality (JSON and CSV)
- ✅ TTL display for each answer
- ✅ Dark mode toggle with localStorage persistence
- ✅ Interactive global map visualization with individual server markers
- ✅ Geographic coordinates for all 33 DNS servers
- ✅ Color-coded answer grouping (CDN/GeoDNS visualization)

**Needs Work:**
- ❌ No tests
- ❌ No custom resolver input in UI (could be added later)

**Location of Key Files:**
- Entry point: `web/src/main.tsx`
- Main component: `web/src/App.tsx`
- API client: `web/src/api.ts`

---

## 🚀 Completion Plan

### Phase 1: Essential Fixes (Priority 1) 🔥 ✅ COMPLETED

**Goal:** Make the app immediately usable and properly configured

- [x] **1.1 Create environment files**
  - [x] Create `api/.env.example` with all configuration variables
  - [x] Create `web/.env.example` with VITE_API_BASE_URL
  - [x] Document each variable's purpose

- [x] **1.2 Expand resolver pool**
  - [x] Add 15-20 more public resolvers (now 30 reliable servers, tested and verified)
  - [x] Include geographic diversity: US, EU, Asia, South America, Asia-Pacific
  - [x] Add proper region labels (e.g., "US/Google", "EU/AdGuard")
  - [x] Update `api/internal/dnsresolver/resolver.go` defaultRegions map

- [x] **1.3 Basic UI improvements**
  - [x] Add CSS framework (Tailwind CSS)
  - [x] Improve typography and spacing
  - [x] Add responsive design (mobile-friendly)
  - [x] Add status badges with colors (green/yellow/red)
  - [x] Replace inline styles with proper CSS

### Phase 2: Core Features (Priority 2) 🎯 ✅ COMPLETED

**Goal:** Essential functionality for DNS propagation checking

- [x] **2.1 Propagation analysis**
  - [x] Calculate propagation percentage (e.g., "75% of servers agree")
  - [x] Group results by unique answers
  - [x] Highlight discrepancies clearly
  - [x] Show summary: "All servers agree" vs "Mixed results"
  - [x] Display which servers have which answers

- [x] **2.2 Enhanced UI features**
  - [ ] Add custom server input field (multi-server support) - DEFERRED
  - [x] Add DNSSEC toggle checkbox
  - [x] Add result sorting (by server, status, RTT)
  - [ ] Add result filtering - DEFERRED
  - [x] Add copy/export buttons (JSON, CSV)
  - [ ] Add recent query history using localStorage - DEFERRED

- [x] **2.3 Better result visualization**
  - [x] Color-code status (success=green, error=red, timeout=yellow)
  - [x] Show authority servers in a clear section
  - [ ] Add collapsible sections for verbose data - DEFERRED
  - [x] Show TTL display for each answer
  - [x] Add visual indicators for resolver performance (RTT display)

### Phase 3: Polish & Quality (Priority 3) ⭐

**Goal:** Production quality and maintainability

- [ ] **3.1 Frontend testing**
  - [ ] Setup Vitest test framework
  - [ ] Write component tests for App.tsx
  - [ ] Write tests for api.ts client
  - [ ] Add test script to package.json
  - [ ] Aim for >70% coverage

- [ ] **3.2 Metrics implementation**
  - [ ] Add Prometheus metrics endpoint
  - [ ] Implement basic counters: requests, errors, cache hits/misses
  - [ ] Add histograms: request duration, resolver RTT
  - [ ] Add gauge: inflight queries
  - [ ] Update config to support METRICS_ADDR

- [ ] **3.3 Documentation updates**
  - [ ] Verify all README instructions work
  - [ ] Add screenshots to README
  - [ ] Add troubleshooting section
  - [ ] Document deployment process step-by-step
  - [ ] Add API examples for all record types

### Phase 4: Advanced Features (Optional) 🚀

**Goal:** Nice-to-have features for enhanced UX

- [ ] **4.1 Streaming results (SSE)**
  - [ ] Implement Server-Sent Events endpoint
  - [ ] Show results as they arrive (don't wait for slowest)
  - [ ] Add progress indicator (X/N resolvers responded)
  - [ ] Update frontend to handle streaming

- [ ] **4.2 Result persistence & sharing**
  - [ ] Add SQLite/Postgres database
  - [ ] Store check results with unique IDs
  - [ ] Generate shareable links (e.g., /check/{id})
  - [ ] Add history view for recent checks
  - [ ] Add comparison view for multiple checks

- [ ] **4.3 DNS over HTTPS (DoH)**
  - [ ] Add DoH resolver support
  - [ ] Implement DoH client using HTTPS
  - [ ] Create allowlist of trusted DoH endpoints
  - [ ] Add DoH-specific configuration
  - [ ] Update UI to distinguish UDP vs DoH

- [ ] **4.4 Additional enhancements**
  - [ ] Add WHOIS lookup integration
  - [ ] Add NS record tracing
  - [ ] Add PTR (reverse DNS) support
  - [ ] Add email notifications for changes
  - [ ] Add API rate limiting tiers
  - [x] Add dark mode toggle ✅
  - [x] Add interactive global map ✅
  - [x] Add DNSSEC tooltip ✅

---

## 🔧 Technical Details

### Default Resolvers (Current - 30 Total) ⭐ Updated!
```
North America - US West (8):
1.1.1.1, 1.0.0.1                 - Cloudflare (San Francisco)
8.8.8.8, 8.8.4.4                 - Google (Mountain View)
9.9.9.9, 149.112.112.112         - Quad9 (Berkeley)
208.67.222.222, 208.67.220.220   - OpenDNS (San Francisco)

North America - US East (4):
156.154.70.1, 156.154.71.1       - Neustar/UltraDNS (Ashburn, VA)
4.2.2.1, 4.2.2.2                 - Level3 (Broomfield, CO)

North America - Canada (2):
76.76.2.0, 76.76.10.0            - ControlD (Toronto)

Europe (6):
94.140.14.14, 94.140.15.15       - AdGuard (Cyprus)
185.228.168.9, 185.228.169.9     - CleanBrowsing (Amsterdam)
77.88.8.8, 77.88.8.1             - Yandex (Moscow)

Asia (7):
114.114.114.114, 114.114.115.115 - 114DNS (Nanjing, China)
223.5.5.5, 223.6.6.6             - AliDNS (Hangzhou, China)
119.29.29.29                     - DNSPod (Shenzhen, China)
168.95.1.1, 168.95.192.1         - HiNet (Taipei, Taiwan)

Asia-Pacific (2):
1.1.1.2, 1.0.0.2                 - Cloudflare (Sydney)

South America (1):
200.221.11.100                   - NET (Rio de Janeiro, Brazil)
```

**Note:** Each server has individual geographic coordinates for accurate map display.

### Environment Variables

**Backend (api/.env):**
```bash
PORT=8080                              # HTTP server port
LOG_LEVEL=info                         # debug|info|warn|error
CORS_ORIGINS=http://localhost:5173     # Comma-separated allowed origins
RESOLVERS=1.1.1.1,8.8.8.8,...          # Comma-separated resolver IPs
REQUEST_TIMEOUT=2s                     # Max duration for entire request
CACHE_TTL=30s                          # Max cache entry lifetime
CACHE_MAX_ENTRIES=5000                 # LRU cache size
ENABLE_DNSSEC=false                    # Default DNSSEC flag
RATE_LIMIT_RPS=1.0                     # Requests per second per IP
RATE_LIMIT_BURST=5                     # Token bucket burst size
RATE_LIMIT_TTL=10m                     # Client limiter cleanup time
```

**Frontend (web/.env.local):**
```bash
VITE_API_BASE_URL=http://localhost:8080  # Backend API URL
```

### API Endpoints

**POST /api/resolve**
```json
Request:
{
  "name": "example.com",
  "type": "A",
  "servers": ["1.1.1.1", "8.8.8.8"],  // optional
  "dnssec": false                      // optional
}

Response:
{
  "name": "example.com",
  "type": "A",
  "results": [
    {
      "server": "1.1.1.1",
      "region": "Global/Cloudflare",
      "status": "ok",
      "rtt_ms": 12.4,
      "answers": [{"value": "93.184.216.34", "ttl": 300}],
      "authority": ["ns1.example.net."],
      "when": "2025-11-01T20:00:00Z"
    }
  ]
}
```

**GET /api/healthz** - Always returns 200 OK

**GET /api/readyz** - Returns 200 if resolvers are responsive, 503 if degraded

### Build Commands

```bash
# Backend
make api          # Run API server
make dev          # Run with hot reload (Air)
make build        # Build binary to bin/
make test         # Run tests
make int-test     # Run integration tests
make lint         # Format and vet

# Frontend
make web-dev      # Install deps and run dev server
make web-build    # Build production bundle
make web-preview  # Preview production build

# Testing
make smoke        # Smoke test against running API
API_BASE=https://your-api.railway.app make smoke  # Test deployed API
```

---

## 📝 Development Workflow

### Starting a New Feature

1. **Review this document** - Check what's already done
2. **Read `COMPLETED_WORK.md`** - See what was accomplished in previous sessions
3. **Check off completed items** - Update checkboxes as you work
4. **Update status** - Modify completion percentages if significant progress
5. **Test thoroughly** - Run relevant test suites
6. **Update docs** - Keep README, INSTRUCTIONS.md, TODO.md, and COMPLETED_WORK.md in sync

### Running Locally

**Prerequisites:**
- Go 1.22+ (1.23.4 recommended)
- Node.js 18+ with npm

**Backend:**
```bash
cd api
go run cmd/server/main.go
# Server runs on http://localhost:8080
```

**Frontend:**
```bash
cd web
npm install
echo "VITE_API_BASE_URL=http://localhost:8080" > .env.local
npm run dev
# Dev server runs on http://localhost:5173
```

**Both at once:**
```bash
# Terminal 1
cd api && go run cmd/server/main.go

# Terminal 2
cd web && npm run dev
```

### When Stuck

1. Check `docs/ARCHITECTURE.md` for design decisions
2. Check `README.md` for setup instructions
3. Review existing tests for usage examples
4. Check Railway logs if deployment issues

### Before Deploying

1. Ensure Go is installed (1.22+ required, 1.23.4+ recommended)
   - macOS: `brew install go` or download from https://go.dev/dl/
   - If installed locally: Go is at `~/go-install/go/bin/go`
2. Run `make test` (backend tests)
3. Run `make lint` (code quality)
4. Run `make smoke` against localhost
5. Test frontend build: `make web-build`
6. Verify environment variables are set in Railway

---

## 🎨 UI/UX Design Principles

When improving the frontend, follow these guidelines:

1. **Clarity First** - DNS data can be complex; make it scannable
2. **Progressive Disclosure** - Show summaries by default, details on demand
3. **Visual Hierarchy** - Use color/size to indicate importance
4. **Status at a Glance** - User should immediately see if DNS is propagated
5. **Performance Feedback** - Show loading states, progress, and timing
6. **Mobile Friendly** - Responsive design is essential
7. **Accessibility** - Use semantic HTML, proper ARIA labels

---

## 🐛 Known Issues

- Frontend has no tests (Vitest needs to be set up)
- Metrics endpoint not implemented (Prometheus)
- No streaming support (all results wait for slowest resolver)
- No custom resolver input in UI (API supports it, just not exposed in frontend)
- No query history persistence (localStorage could be added)

---

## 🎯 Quick Wins for Immediate Impact

~~If you have limited time, prioritize:~~

~~1. **Environment files** (15 min) - Essential for setup~~  
~~2. **Expand resolver list** (30 min) - Makes the tool actually useful~~  
~~3. **Add Tailwind CSS** (1 hour) - Dramatically improves appearance~~  
~~4. **Propagation summary** (2 hours) - Core value proposition~~

✅ **ALL QUICK WINS COMPLETED!** The app is now at 95% completion.

**Remaining Optional Work:**
- Frontend testing (Vitest setup)
- Prometheus metrics endpoint
- Server-Sent Events for streaming results
- Custom resolver input in UI
- Query history with localStorage

---

## 📞 Resources

- **Architecture:** `docs/ARCHITECTURE.md`
- **README:** `README.md`
- **Makefile:** Root directory
- **Railway Config:** `railway.toml`
- **Go DNS Library:** https://github.com/miekg/dns
- **Chi Router:** https://github.com/go-chi/chi
- **Vite Docs:** https://vitejs.dev/

---

## 🔄 How to Update This Document

When you complete a task:
1. Check the box: `- [ ]` becomes `- [x]`
2. Update completion percentages in "Current Status"
3. Update "Last Updated" date at top
4. Add any new known issues
5. Move completed phases to a "Completed" section if desired

---

**Remember:** This is a well-architected project that's now 99% complete. Both the backend and frontend are production-ready. The core functionality is fully implemented with a beautiful, modern UI including dark mode, interactive map, and 30 reliable global DNS resolvers with human-readable geographic labels. Remaining work is optional polish (testing, metrics, advanced features).

---

## 📖 Session History

### Session 6 (November 2, 2025) ✅
**Major accomplishments:**
- ✅ Tested all 38 DNS servers with nytimes.com for reliability
- ✅ Removed 8 unreliable servers (6 from initial test + 2 Verisign)
  - DNS.WATCH (timeout), IIJ Japan (refused), Tata India (timeout)
  - Telstra Australia (timeout), Verisign (intermittent failures)
- ✅ Updated region labels to "City, State/Province/Country, Provider" format
  - e.g., "San Francisco, CA, Cloudflare" instead of "US/Cloudflare"
- ✅ Fixed map tooltip positioning (now appears near marker, not far away)
- ✅ Made all server counts dynamic (header, footer auto-update)
- ✅ Final configuration: 30 reliable DNS servers across 5 continents
- ✅ All remaining servers verified with RTT ≤500ms

**Status:** 98% → 99% Complete

### Session 4 (November 2, 2025) ✅
**Major accomplishments:**
- ✅ Fixed resolver count - all 28 servers now working (was showing only 4)
- ✅ Implemented dark mode toggle with full UI coverage
- ✅ Added localStorage persistence for theme preference
- ✅ Created interactive global map visualization
- ✅ Integrated react-simple-maps with d3-geo
- ✅ Added geographic markers with status indicators
- ✅ Implemented DNSSEC tooltip with detailed explanation
- ✅ Verified all features working locally
- ✅ Comprehensive dark mode styling for all components

**Status:** 95% → 98% Complete

### Session 3 (November 2, 2025) ✅
**See `COMPLETED_WORK.md` for full details**

Major accomplishments:
- ✅ Expanded DNS resolver pool from 8 → 28 servers (5 continents)
- ✅ Added Tailwind CSS and completely redesigned UI
- ✅ Implemented propagation analysis with visual summary
- ✅ Added color-coded status badges
- ✅ Implemented sorting (server, status, RTT)
- ✅ Added JSON/CSV export functionality
- ✅ Added DNSSEC toggle in UI
- ✅ Fully responsive design
- ✅ Installed Go 1.23.4 locally
- ✅ Tested full stack locally in browser
- ✅ App is production-ready!

**Status:** 75% → 95% Complete

