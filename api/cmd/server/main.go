package main

import (
	"log"
	"net/http"
	"time"


	apiPkg "github.com/legertom/dnsprop/api/internal/api"
	"github.com/legertom/dnsprop/api/internal/cache"
	"github.com/legertom/dnsprop/api/internal/config"
	"github.com/legertom/dnsprop/api/internal/logging"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}
	// Initialize logging
	logging.Init(cfg.LogLevel)

	// Initialize resolver cache
	resolverCache, err := cache.NewLRU(cfg.CacheMaxEntries, cfg.CacheTTL)
	if err != nil {
		log.Fatalf("cache init: %v", err)
	}

	r := apiPkg.NewRouter(cfg, resolverCache)

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
