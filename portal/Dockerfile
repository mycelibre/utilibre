# syntax=docker/dockerfile:1.8
FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
# Runtime serves the built portal with node directly; it never installs packages.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server-built ./server-built
COPY --chown=node:node server ./server
USER node
EXPOSE 8080
CMD ["node", "server/server.mjs"]
