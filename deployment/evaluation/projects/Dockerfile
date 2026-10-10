ARG NODE_IMAGE=node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

FROM ${NODE_IMAGE} AS server-dependencies

RUN apk add build-base python3 --no-cache
RUN npm install --global npm@11.19.1 --no-audit --no-fund

WORKDIR /app

COPY server/package.json server/package-lock.json ./

RUN npm ci --omit=dev --no-audit --no-fund

FROM ${NODE_IMAGE} AS client

RUN npm install --global npm@11.19.1 --no-audit --no-fund

WORKDIR /app

COPY client/package.json client/package-lock.json client/.npmrc ./

RUN npm ci --omit=dev --no-audit --no-fund

COPY client .

RUN npm run postinstall && DISABLE_ESLINT_PLUGIN=true npm run build

FROM ${NODE_IMAGE}

RUN apk add bash --no-cache && mkdir -p /app && chown node:node /app

USER node
WORKDIR /app

COPY --chown=node:node start.sh .
COPY --chown=node:node healthcheck.js .
COPY --chown=node:node server .

RUN mv .env.sample .env

COPY --from=server-dependencies --chown=node:node /app/node_modules node_modules

COPY --from=client --chown=node:node /app/build public
COPY --from=client --chown=node:node /app/build/index.html views/index.ejs

VOLUME /app/public/user-avatars
VOLUME /app/public/project-background-images
VOLUME /app/attachments

EXPOSE 1337

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
  CMD node ./healthcheck.js

CMD ["./start.sh"]
