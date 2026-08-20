# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Stage 2: Build Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build

# Stage 3: Production runner environment
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root system user
RUN addgroup -S nextgroup && adduser -S nextuser -G nextgroup && \
    chown -R nextuser:nextgroup /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

USER nextuser

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "start"]
