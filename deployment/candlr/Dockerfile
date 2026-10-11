FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS frontend
WORKDIR /src
ENV ASTRO_TELEMETRY_DISABLED=1
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
RUN npm run build
FROM bellamy/candlr:2.0.0@sha256:c627f123c164148c9b9e89ffae5423da6e21cb927e557620b957aabb77facaeb
COPY --from=frontend /src/dist /app/frontend/dist
