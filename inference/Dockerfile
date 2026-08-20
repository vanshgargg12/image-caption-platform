# Stage 1: Build TypeScript source
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production runner environment
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV INFERENCE_PORT=3001
ENV MODEL_CACHE_DIR=/app/.cache
ENV MODEL_ID=Xenova/vit-gpt2-image-captioning
ENV MODEL_REVISION=main

# Create non-root system user and cache directory
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup && \
    mkdir -p /app/.cache && \
    chown -R nodeuser:nodegroup /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER nodeuser

EXPOSE 3001

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=30 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/internal/ready || exit 1

CMD ["node", "dist/server.js"]
