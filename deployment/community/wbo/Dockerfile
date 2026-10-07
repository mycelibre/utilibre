FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
LABEL org.opencontainers.image.source="https://github.com/lovasoa/whitebophir" \
      org.opencontainers.image.revision="f37875a6b427397e579e2a869caf073ae87ee264" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"
WORKDIR /opt/app
COPY --from=integration package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=1000:1000 . .
COPY --from=integration package.json package-lock.json ./
USER 1000:1000
ENV NODE_ENV=production PORT=8080 OTEL_SDK_DISABLED=true LOG_LEVEL=warn
EXPOSE 8080
CMD ["node", "server/server.mjs"]
