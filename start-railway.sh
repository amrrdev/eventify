#!/bin/sh
set -e

echo "[railway] starting all services..."

# Start Redis in background
echo "[railway] starting redis"
redis-server --daemonize yes \
  --port 6379 \
  --bind 127.0.0.1 \
  --save "" \
  --appendonly no \
  --maxmemory 128mb \
  --maxmemory-policy allkeys-lru

# Wait for Redis
echo "[railway] waiting for redis"
until redis-cli ping >/dev/null 2>&1; do
  sleep 0.5
done
echo "[railway] redis ready"

# Start NestJS app in background
echo "[railway] starting nestjs app"
cd /app
NODE_ENV=production node dist/main.js &
NESTJS_PID=$!

# Wait for NestJS to be ready
echo "[railway] waiting for nestjs"
sleep 5
for i in $(seq 1 30); do
  if curl -f http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "[railway] nestjs ready"
    break
  fi
  sleep 1
done

# Cleanup on exit
cleanup() {
    echo "[railway] shutting down..."
    kill $NESTJS_PID 2>/dev/null || true
    exit
}
trap cleanup TERM INT

# Start Nginx in foreground (main process)
echo "[railway] starting nginx proxy"
exec nginx -g 'daemon off;'