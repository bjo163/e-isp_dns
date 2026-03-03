# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Download deps first (layer cache)
COPY go.mod go.sum ./
RUN go mod download

# Build binary — CGO_ENABLED=0 because glebarez/sqlite is pure-Go
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o dns-server .

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM alpine:3.21

WORKDIR /app

# ca-certificates for outbound HTTPS (import endpoint), tzdata for logs
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/dns-server .

# Persistent data directory (SQLite DB lives here)
RUN mkdir -p data
VOLUME ["/app/data"]

# 53/udp + 53/tcp = DNS  |  8080 = Fiber admin API
EXPOSE 53/udp
EXPOSE 53/tcp
EXPOSE 8080

CMD ["./dns-server", "-db", "data/trustpositif.db"]
