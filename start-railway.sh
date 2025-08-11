#!/bin/sh
set -e

echo "[railway] starting services for Railway deployment..."

# Start Redis in background
echo "[railway] starting redis server"
redis-server --daemonize yes \
  --port 6379 \
  --bind 127.0.0.1 \
  --save "" \
  --appendonly no \
  --maxmemory 128mb \
  --maxmemory-policy noeviction

# Wait for Redis
echo "[railway] waiting for redis to be ready"
until redis-cli ping >/dev/null 2>&1; do
  sleep 0.5
done
echo "[railway] ✅ redis ready on port 6379"

# Check if MongoDB connection is available (Railway might provide DATABASE_URL)
if [ -z "$DATABASE_URL" ]; then
    echo "[railway] ⚠️  WARNING: DATABASE_URL not set - app may fail"
    echo "[railway] ⚠️  Please set DATABASE_URL environment variable in Railway"
fi

# Start NestJS app in background with better error handling
echo "[railway] starting nestjs application"
cd /app

# Set Railway-specific environment
export NODE_ENV=production
export PORT=3000

# Start the app and capture the PID
node dist/main.js &
NESTJS_PID=$!

# Give NestJS more time to start and handle DB connection issues
echo "[railway] waiting for nestjs to initialize (30s timeout)"
sleep 10

# Check if the process is still running
if ! kill -0 $NESTJS_PID 2>/dev/null; then
    echo "[railway] ❌ NestJS process died during startup"
    exit 1
fi

# Try to connect to the health endpoint
for i in $(seq 1 20); do
  if curl -f http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
    echo "[railway] ✅ nestjs health check passed"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "[railway] ⚠️  health check timeout - continuing anyway"
  fi
  sleep 1
done

# Cleanup function
cleanup() {
    echo "[railway] shutting down services..."
    kill $NESTJS_PID 2>/dev/null || true
    exit
}
trap cleanup TERM INT

# Start Nginx in foreground (main process for Railway)
echo "[railway] starting nginx reverse proxy on port 80"
echo "[railway] 🚀 all services ready - nginx will handle incoming requests"

# Railway expects the main process to be on port 80
exec nginx -g 'daemon off;'