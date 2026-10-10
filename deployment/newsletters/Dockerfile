FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ git
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY source ./source
COPY static ./static
COPY configuration ./configuration
RUN npm rebuild && npm run prepare && npm prune --omit=dev --ignore-scripts
FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/static ./static
COPY package.json package-lock.json LICENSE.md ./
USER 1000:1000
CMD ["node", "build/application.mjs", "/configuration.mjs", "--type", "webServer", "--port", "18000"]
