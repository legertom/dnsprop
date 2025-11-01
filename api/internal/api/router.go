package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/legertom/dnsprop/api/internal/config"
	"github.com/legertom/dnsprop/api/internal/logging"
	"github.com/legertom/dnsprop/api/internal/ratelimit"
	resolver "github.com/legertom/dnsprop/api/internal/dnsresolver"
)

// NewRouter wires middlewares and routes for the API server.
func NewRouter(cfg *config.Config, cache resolver.Cache) http.Handler {
	r := chi.NewRouter()

	// Standard middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(logging.StructuredLogger)
	r.Use(ratelimit.LimiterMiddleware(cfg.RateLimitRPS, cfg.RateLimitBurst, cfg.RateLimitTTL))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CorsOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/api/healthz", Healthz)
	r.Get("/api/readyz", ReadyzHandler(cfg, cache))
	r.Post("/api/resolve", ResolveHandler(cfg, cache))

	// reasonable server default timeouts if used directly (optional here)
	_ = (&http.Server{ReadTimeout: 5 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second})
	return r
}