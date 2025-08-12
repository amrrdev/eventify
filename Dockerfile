FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM nginx:alpine
WORKDIR /app

RUN apk add --no-cache nodejs npm redis curl

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY --from=build /app/src/proto ./src/proto

COPY start-railway.sh ./start-railway.sh
RUN chmod +x start-railway.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD redis-cli ping && curl -f http://localhost/health || exit 1

CMD ["./start-railway.sh"]