# -------- Build stage --------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# -------- Railway production with Nginx --------
FROM nginx:alpine AS railway
WORKDIR /app

# Install Node.js and Redis
RUN apk add --no-cache nodejs npm redis curl

# Copy Nginx config for Railway
COPY nginx.conf /etc/nginx/nginx.conf

# Copy production node_modules and built app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Copy proto files explicitly (gRPC needs these at runtime)
COPY --from=build /app/src/proto ./src/proto

# Copy startup script for Railway (starts redis + node + nginx)
COPY start-railway.sh ./start-railway.sh
RUN chmod +x start-railway.sh

# Railway exposes only port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD redis-cli ping && curl -f http://localhost/health || exit 1

CMD ["./start-railway.sh"]