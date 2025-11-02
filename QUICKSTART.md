# 🚀 dnsprop Quick Start Guide

**New to this project? Start here!**

---

## 📚 Documentation Overview

This project has comprehensive documentation. Here's what to read and when:

### 1. **TODO.md** 📋 (Start Here!)
- **When:** You want to see what needs to be done at a glance
- **Time:** 2 minutes
- **Purpose:** Quick checklist of all tasks

### 2. **INSTRUCTIONS.md** ⭐ (Read This Next!)
- **When:** Starting a new conversation or need detailed context
- **Time:** 10-15 minutes
- **Purpose:** Complete development guide with status, plan, and technical details

### 3. **README.md** 📖
- **When:** Setting up the project locally or deploying
- **Time:** 5-10 minutes
- **Purpose:** How to run, test, and deploy the application

### 4. **docs/ARCHITECTURE.md** 🏗️
- **When:** Understanding design decisions or adding major features
- **Time:** 15-20 minutes
- **Purpose:** Architecture principles and technical design

### 5. **SESSION_LOG.md** 📝
- **When:** Checking what was done in previous sessions
- **Time:** 2-3 minutes per session
- **Purpose:** Track progress and decisions made

---

## ⚡ New Conversation Starter

If you're starting a fresh conversation with an AI assistant, say:

> "Open and read INSTRUCTIONS.md, then check TODO.md for the next unchecked items to work on. Start with Phase 1 tasks."

---

## 🎯 Current Status (November 1, 2025)

- **Overall Progress:** 75-80% complete
- **Backend:** ~90% complete (excellent quality)
- **Frontend:** ~70% complete (functional, needs polish)
- **Next Priority:** Phase 1 - Essential Fixes

---

## 🏃 If You Just Want to Run It

```bash
# Backend (terminal 1)
cd api
go run ./cmd/server

# Frontend (terminal 2)
cd web
npm install
npm run dev
```

Then visit: http://localhost:5173

---

## 🔧 If You Just Want to Build

```bash
# Backend
make build

# Frontend
make web-build

# Both
make build && make web-build
```

---

## 🧪 If You Just Want to Test

```bash
# Backend tests
make test

# Integration tests (requires network)
make int-test

# Smoke test (requires running API)
make smoke
```

---

## 🚢 If You Just Want to Deploy

1. Push to GitHub
2. Connect to Railway
3. Railway will use `railway.toml` to deploy both services
4. Set environment variables in Railway dashboard

See README.md "Deploying on Railway" section for details.

---

## 🛠️ If You Want to Develop

**Phase 1 tasks are the highest priority:**

1. Create environment files (15 min)
2. Expand resolver pool (30 min)
3. Add Tailwind CSS to frontend (1 hour)
4. Build propagation summary feature (2 hours)

See TODO.md for the complete checklist.

---

## 📁 Repository Structure

```
dnsprop/
├── api/                      # Go backend
│   ├── cmd/server/           # Main entry point
│   ├── internal/             # Internal packages
│   │   ├── api/              # HTTP handlers
│   │   ├── dnsresolver/      # DNS query engine
│   │   ├── cache/            # LRU cache
│   │   ├── ratelimit/        # Rate limiting
│   │   ├── validation/       # Input validation
│   │   └── config/           # Configuration
│   ├── Dockerfile
│   └── go.mod
│
├── web/                      # React frontend
│   ├── src/
│   │   ├── App.tsx           # Main component
│   │   ├── api.ts            # API client
│   │   └── main.tsx          # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── docs/
│   └── ARCHITECTURE.md       # Design decisions
│
├── INSTRUCTIONS.md           # ⭐ Main development guide
├── TODO.md                   # 📋 Quick checklist
├── SESSION_LOG.md            # 📝 Progress tracking
├── README.md                 # 📖 Setup & deployment
├── QUICKSTART.md             # 🚀 You are here!
├── Makefile                  # Build commands
└── railway.toml              # Deployment config
```

---

## 💡 Pro Tips

1. **Check TODO.md first** - Always see what's next at a glance
2. **Update checkboxes** - Mark items complete as you go
3. **Read INSTRUCTIONS.md** - It has everything you need
4. **Use the Makefile** - Don't run commands manually
5. **Test as you go** - Run `make test` frequently

---

## 🆘 Common Issues

**"Can't run the API"**
- Make sure Go 1.22+ is installed: `go version`
- Check you're in the right directory
- Missing dependencies? Run: `cd api && go mod download`

**"Can't run the frontend"**
- Make sure Node 20+ is installed: `node --version`
- Install dependencies: `cd web && npm install`
- Check the port isn't in use: `lsof -i :5173`

**"Tests are failing"**
- Some tests require network access
- Run with: `make int-test` instead of `make test`

**"Where do I start coding?"**
- Check TODO.md for next unchecked item
- Phase 1 tasks are highest priority
- Start with environment files

---

## 🎓 Learning Resources

- **Go DNS Library:** https://github.com/miekg/dns
- **Chi Router:** https://github.com/go-chi/chi
- **React + Vite:** https://vitejs.dev/guide/
- **TypeScript:** https://www.typescriptlang.org/docs/

---

**Remember:** The backend is excellent. Focus on frontend polish to reach production quality!

For detailed information, see [INSTRUCTIONS.md](INSTRUCTIONS.md).

