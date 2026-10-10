FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS dependencies
WORKDIR /build/gathio
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global pnpm@10.30.3 && pnpm install --prod --frozen-lockfile --ignore-scripts
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /srv/gathio
COPY --from=dependencies /build/gathio/node_modules ./node_modules
COPY package.json ./
COPY dist ./dist
COPY views ./views
COPY locales ./locales
COPY public ./public
ENV NODE_ENV=production npm_package_version=1.6.7-p1
USER 1000:1000
CMD ["node", "dist/start.js"]
