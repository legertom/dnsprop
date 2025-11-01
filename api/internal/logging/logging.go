package logging

import (
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"log/slog"
)

// StructuredLogger is a chi middleware that logs request/response with slog JSON.
func StructuredLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(rw, r)
		dur := time.Since(start)

		attrs := []slog.Attr{
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rw.Status()),
			slog.Int("bytes", rw.BytesWritten()),
			slog.String("remote_ip", r.Header.Get("X-Real-IP")),
			slog.String("user_agent", r.UserAgent()),
			slog.String("req_id", middleware.GetReqID(r.Context())),
			slog.Duration("duration", dur),
		}
		slog.LogAttrs(r.Context(), slog.LevelInfo, "http_request", attrs...)
	})
}

// Init sets slog default logger based on level ("debug","info","warn","error").
func Init(level string) {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
	slog.SetDefault(logger)
}
