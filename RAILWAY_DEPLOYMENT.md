# Railway Deployment Guide

**Last Updated:** November 2, 2025

## 🚨 Current Issues Blocking Deployment

### Critical Issues

- [ ] **Fix Go version in api/Dockerfile** - Currently `1.24` (doesn't exist), should be `1.23` or `1.22`
- [ ] **Fix web/Dockerfile to accept VITE_API_BASE_URL at build time** - Vite needs this during build
- [ ] **Create .env.example files** - For documentation and reference

### Important Configuration

- [ ] Set CORS_ORIGINS in Railway API service to match web service URL
- [ ] Set VITE_API_BASE_URL in Railway web service to match API service URL
- [ ] Configure health check path to `/api/readyz`

---

## 📋 Pre-Deployment Checklist

### Local Testing

- [ ] API builds locally: `cd api && go build -o dnsprop-api ./cmd/server`
- [ ] Web builds locally: `cd web && npm run build`
- [ ] Docker builds work:
  - [ ] `docker build -t dnsprop-api ./api`
  - [ ] `docker build -t dnsprop-web ./web`
- [ ] Tests pass: `make test`

### Repository Setup

- [ ] Code pushed to GitHub
- [ ] No `.env` files committed (they should be gitignored)
- [ ] Dockerfiles are correct
- [ ] railway.toml is at repository root

---

## 🔧 Fix Instructions

### Fix 1: Update api/Dockerfile

Change line 1 from:
```dockerfile
FROM golang:1.24-alpine AS builder
```

To:
```dockerfile
FROM golang:1.23-alpine AS builder
```

### Fix 2: Update web/Dockerfile

Replace the builder stage with:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Accept build arg for API URL (Railway will pass this)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application with API URL baked in
RUN npm run build

# Production stage
FROM nginx:alpine

# Install envsubst for templating nginx config
RUN apk add --no-cache gettext

# Static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx templated config
RUN mkdir -p /etc/nginx/templates
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default port (overridden by Railway)
ENV PORT=8080
EXPOSE 8080

# Render config with $PORT and start nginx
CMD ["/bin/sh", "-c", "envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
```

### Fix 3: Update railway.toml for web service build args

The `railway.toml` should pass the build arg. However, Railway doesn't support this in the TOML yet, so you'll need to:

**Option A: Use Railway Dashboard**
1. Go to web service settings
2. Under "Build" section
3. Add build argument: `VITE_API_BASE_URL=${{api.RAILWAY_PUBLIC_DOMAIN}}`

**Option B: Use nixpacks instead of Docker for web**

Update `railway.toml`:
```toml
[services.web]
  root = "web"
  env = ["VITE_API_BASE_URL"]
  [services.web.build]
  builder = "NIXPACKS"
```

---

## 🚀 Railway Deployment Steps

### Step 1: Create Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `dnsprop` repository
5. Railway will detect the monorepo via `railway.toml`

### Step 2: Configure API Service

**Environment Variables to Set:**

```bash
# Auto-provided by Railway
PORT=<auto>

# Required - Set these:
LOG_LEVEL=info
CORS_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
RESOLVERS=1.1.1.1,8.8.8.8,9.9.9.9,208.67.222.222,149.112.112.112

# Optional - Defaults are fine:
REQUEST_TIMEOUT=2s
CACHE_TTL=30s
CACHE_MAX_ENTRIES=5000
ENABLE_DNSSEC=false
RATE_LIMIT_RPS=1.0
RATE_LIMIT_BURST=5
```

**Health Check Configuration:**
- Path: `/api/readyz`
- Timeout: 10s
- Interval: 30s

### Step 3: Configure Web Service

**Environment Variables to Set:**

```bash
# Auto-provided by Railway
PORT=<auto>

# Required - Set this:
VITE_API_BASE_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

**Important:** Make sure this is set as a **build-time** environment variable!

### Step 4: Deploy Order

1. Deploy **API service first**
2. Wait for it to be healthy (check logs)
3. Then deploy **web service**
4. The web build will use the API URL from step 1

### Step 5: Verify Deployment

**API Service:**
```bash
# Test health endpoint
curl https://your-api.up.railway.app/api/healthz
# Should return: ok

# Test readyz endpoint
curl https://your-api.up.railway.app/api/readyz
# Should return: {"status":"ok"}

# Test resolve endpoint
curl -X POST https://your-api.up.railway.app/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{"name":"example.com","type":"A"}' | jq
```

**Web Service:**
```bash
# Visit in browser
open https://your-web.up.railway.app

# Or curl
curl https://your-web.up.railway.app
```

---

## 🐛 Common Railway Issues

### Issue: "Web can't connect to API"

**Symptoms:** Frontend loads but API requests fail

**Causes:**
1. CORS_ORIGINS in API doesn't match web domain
2. VITE_API_BASE_URL not set correctly in web
3. API is using HTTP but Railway serves HTTPS

**Solutions:**
1. Check API logs for CORS errors
2. Verify VITE_API_BASE_URL in web service settings
3. Ensure both URLs use `https://`

### Issue: "API returns 503 on /api/readyz"

**Symptoms:** Health check fails, deployment stuck

**Causes:**
1. DNS resolvers unreachable from Railway servers
2. Timeout too aggressive
3. Network restrictions

**Solutions:**
1. Check API logs for DNS query errors
2. Temporarily disable health check
3. Try different resolvers (Google 8.8.8.8 is most reliable)

### Issue: "Build failed: VITE_API_BASE_URL not found"

**Symptoms:** Web build fails

**Causes:**
1. Environment variable not set at build time
2. Using runtime env var instead of build-time

**Solutions:**
1. Set as build-time variable in Railway
2. Or use the updated Dockerfile with ARG

### Issue: "Port already in use"

**Symptoms:** Container crashes with port error

**Causes:**
1. Not reading Railway's PORT env var
2. Hardcoded port in code

**Solutions:**
1. Verify config reads PORT env var (already done in code)
2. Check Docker EXPOSE doesn't conflict

---

## 📊 Post-Deployment Monitoring

### What to Watch

**API Service:**
- Response times (should be < 2s)
- Error rate (should be < 1%)
- Health check status
- Memory usage (should be < 512 MB)

**Web Service:**
- Load times
- Static file serving
- Nginx logs

### Logs to Check

**API Logs:**
```bash
# In Railway dashboard, check for:
- "dnsprop api listening on :8080" (startup)
- Structured JSON logs for each request
- No CORS errors
- No timeout errors
```

**Web Logs:**
```bash
# In Railway dashboard, check for:
- Nginx starting successfully
- No 404 errors for static assets
- No CORS pre-flight failures
```

---

## 🔄 Updating Deployment

### Backend Changes

1. Push to GitHub
2. Railway auto-deploys API service
3. Health check validates before switching traffic
4. Zero-downtime deployment ✅

### Frontend Changes

1. Push to GitHub
2. Railway rebuilds with current VITE_API_BASE_URL
3. Nginx serves new static files
4. Deployment complete

### Environment Variable Changes

1. Update in Railway dashboard
2. **Trigger manual redeploy** (vars don't auto-redeploy)
3. Service restarts with new config

---

## 🎯 Quick Deploy Command

If you have Railway CLI installed:

```bash
# Link project (first time only)
railway link

# Deploy both services
railway up

# Check status
railway status

# View logs
railway logs -s api
railway logs -s web
```

---

## 📞 Getting Help

**Railway Issues:**
- Railway Status: https://status.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app

**Application Issues:**
- Check `INSTRUCTIONS.md` for development guide
- Check `README.md` for configuration
- Run `make smoke API_BASE=<your-url>` to test

---

## ✅ Deployment Success Checklist

- [ ] API service is healthy (green in Railway)
- [ ] Web service is healthy (green in Railway)
- [ ] Health check returns 200: `curl https://api.../api/readyz`
- [ ] Frontend loads in browser
- [ ] Can submit a DNS query from UI
- [ ] Results display correctly
- [ ] No CORS errors in browser console
- [ ] API logs show successful queries

**If all checked, you're deployed! 🎉**

---

## 🔗 Service URLs Template

Save these for reference:

```
API Service: https://[project]-api.up.railway.app
Web Service: https://[project]-web.up.railway.app

Health Check: https://[project]-api.up.railway.app/api/healthz
Readyz Check: https://[project]-api.up.railway.app/api/readyz
Resolve API:  https://[project]-api.up.railway.app/api/resolve
```

