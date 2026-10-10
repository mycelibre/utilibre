FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
RUN npm install -g pnpm@10.30.3
COPY . .
RUN pnpm install --frozen-lockfile
RUN NODE_OPTIONS=--max-old-space-size=3072 pnpm build
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
ENV NODE_ENV=production CONFIG_PATH=/app/config
WORKDIR /app
COPY --from=build --chown=node:node /app/packages/socket/dist/index.cjs /app/socket/index.cjs
COPY --from=build /app/packages/web/dist /app/web
USER node
CMD ["node", "/app/socket/index.cjs"]
