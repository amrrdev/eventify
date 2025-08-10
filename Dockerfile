# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install Redis
RUN apk add --no-cache redis

# Copy dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts --only=production

# Copy build files
COPY --from=builder /app/dist ./dist

# Copy Redis configuration
COPY redis.conf /etc/redis.conf

# Expose ports
EXPOSE 3000 50051 6379

# Start Redis and application
CMD ["sh", "-c", "redis-server /etc/redis.conf & node dist/main.js"]