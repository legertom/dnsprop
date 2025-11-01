package main

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	apiPkg "github.com/legertom/dnsprop/api/internal/api"
	"github.com/legertom/dnsprop/api/internal/cache"
	"github.com/legertom/dnsprop/api/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	r := chi.NewRouter()

	// Initialize resolver cache
	resolverCache, err := cache.NewLRU(cfg.CacheMaxEntries, cfg.CacheTTL)
	if err != nil {
		log.Fatalf("cache init: %v", err)
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CorsOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/api/healthz", apiPkg.Healthz)
	r.Post("/api/resolve", apiPkg.ResolveHandler(cfg, resolverCache))

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("dnsprop api listening on :%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
