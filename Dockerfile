# Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Next.js export output is 'out' folder
RUN npm run build

# Build Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# CGO_ENABLED=0 for static binary, but we rely on pty which might need CGO or specific OS support?
# creack/pty uses CGO? No, pure Go implementation for linux.
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final Stage
FROM alpine:latest

# Install dependencies for system management (since user wants to manage host services)
# But strictly speaking, standard container shouldn't have these.
# However, for "Service Manager" feature (systemd), we need systemctl client?
# Alpine doesn't use systemd. It uses OpenRC.
# If controlling HOST systemd, we need to mount host sockets.
# We'll install minimal tools.
RUN apk add --no-cache bash ca-certificates curl

WORKDIR /app

# Copy artifacts
COPY --from=backend-builder /app/main .
COPY --from=frontend-builder /app/out ./out

# Create DB directory
RUN mkdir -p /app/data

# Environment
ENV PORT=8080

EXPOSE 8080

# Run
CMD ["./main"]
