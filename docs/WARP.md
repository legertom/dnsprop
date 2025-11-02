# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

dnsprop is a DNS propagation checker tool that monitors DNS record propagation across multiple DNS servers worldwide.

## Current State

The project has a working monorepo structure with scaffolded frontend and backend services:

- **Backend (api/)**: Go service using `chi` router and `miekg/dns` for DNS queries
- **Frontend (web/)**: React + Vite + TypeScript application
- **Build System**: Makefile with targets for both services
- **Deployment**: Railway.toml configured for monorepo deployment
- **Documentation**: README.md and docs/ARCHITECTURE.md

## Technology Stack

- **Backend**: Go 1.22+, chi router, miekg/dns, slog for logging
- **Frontend**: React, Vite, TypeScript
- **Package Manager**: npm (frontend)
- **Deployment**: Railway (two services: api and web)

## Project Structure

```
/
├── api/                # Go HTTP API service
│   ├── cmd/server/     # Main entry point
│   ├── internal/       # Internal packages
│   ├── .air.toml       # Hot reload config
│   ├── .env.example    # Environment template
│   ├── go.mod/go.sum   # Go dependencies
│   └── dnsprop-api     # Built binary
├── web/                # React frontend
│   ├── src/            # React components
│   ├── .env.example    # Environment template
│   ├── package.json    # npm dependencies
│   ├── tsconfig.json   # TypeScript config
│   └── vite.config.ts  # Vite bundler config
├── docs/               # Architecture docs
├── Makefile            # Build automation
├── railway.toml        # Railway deployment config
└── README.md           # Project documentation
```

## Development Commands

**Backend:**
- `make api` - Run API server (no hot reload)
- `make dev` - Run with Air hot reload
- `make build` - Build binary to bin/
- `make test` - Run Go tests
- `make lint` - Format and vet code
- `make tidy` - Update dependencies

**Frontend:**
- `make web-dev` - Install deps and run dev server
- `make web-build` - Build production bundle
- `make web-preview` - Preview production build

## Environment Setup

**Backend** (`api/.env`):
- Copy from `api/.env.example`
- Key variables: PORT, LOG_LEVEL, CORS_ORIGINS, RESOLVERS

**Frontend** (`web/.env.local`):
- Copy from `web/.env.example`
- Key variable: VITE_API_BASE_URL (points to backend)

## API Endpoints

- `POST /api/resolve` - Query DNS across multiple resolvers
- `GET /api/healthz` - Health check

## Testing

- Backend: `make test` or `go -C api test ./...`
- Frontend: No test framework configured yet

## Deployment

Railway monorepo with two services defined in railway.toml:
- `api` service (Go backend)
- `web` service (React frontend with Vite preview)

Each service needs appropriate environment variables set in Railway dashboard.
