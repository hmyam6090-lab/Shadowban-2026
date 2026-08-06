# Multi-stage Dockerfile for ShadowBan
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build shared package
FROM base AS shared
WORKDIR /app/packages/shared
COPY packages/shared/package*.json ./
RUN npm ci --include=workspaces
COPY packages/shared/src ./src
RUN npm run build

# Build server
FROM base AS server
WORKDIR /app/apps/server
COPY apps/server/package*.json ./
RUN npm ci --include=workspaces
COPY apps/server/src ./src
COPY packages ./../packages
RUN npm run build

# Build client
FROM base AS client
WORKDIR /app/apps/client
COPY apps/client/package*.json ./
RUN npm ci --include=workspaces
COPY apps/client/src ./src
COPY apps/client/vite.config.ts ./
COPY packages ./../packages
RUN npm run build

# Production image with nginx
FROM nginx:alpine
RUN apk add --no-cache nodejs npm
WORKDIR /app

# Copy server build
COPY --from=server /app/apps/server/dist ./server-dist
COPY --from=server /app/apps/server/package*.json ./apps/server/
COPY --from=server /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=shared /app/packages/shared ./packages/shared

# Copy client build
COPY --from=client /app/apps/client/dist ./client-dist

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx and server
CMD sh -c "cd apps/server && node dist/index.js & nginx -g 'daemon off;'"
