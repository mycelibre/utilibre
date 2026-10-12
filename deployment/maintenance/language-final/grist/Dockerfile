FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS leaves
WORKDIR /reviewed
COPY package*.json ./
RUN npm_config_update_notifier=false npm ci --ignore-scripts --omit=dev --no-audit --no-fund
# build.mjs requires the exact tested Deno/Pyodide privacy candidate ID.
FROM utilibre-grist:1.7.21-deno297-security-20261011
USER root
COPY --from=leaves /reviewed /opt/utilibre-grist-reviewed-leaves
COPY replace.cjs /tmp/utilibre-grist-leaves.cjs
RUN node /tmp/utilibre-grist-leaves.cjs && rm /tmp/utilibre-grist-leaves.cjs
USER 1000:1000
