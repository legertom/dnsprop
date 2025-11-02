FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o dnsprop-api ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/dnsprop-api .

# Railway provides PORT dynamically (Railway overrides this default)
ENV PORT=8080

CMD ["./dnsprop-api"]

