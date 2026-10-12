ARG BASE
FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS leaves
WORKDIR /reviewed
COPY package*.json ./
RUN npm_config_update_notifier=false npm ci --ignore-scripts --omit=dev --no-audit --no-fund
FROM leaves AS mysql
RUN rm -rf /reviewed/node_modules/adm-zip
FROM ${BASE} AS mysql-runtime
USER root
ARG TARGET
ARG FINAL_USER
COPY --from=mysql /reviewed /opt/utilibre-app-reviewed-leaves
COPY replace.cjs /tmp/utilibre-app-leaves.cjs
COPY spliit-privacy.cjs /tmp/utilibre-spliit-privacy.cjs
RUN node /tmp/utilibre-app-leaves.cjs "$TARGET" mysql2 3.15.3 3.23.1 && node /tmp/utilibre-spliit-privacy.cjs "$TARGET" && rm /tmp/utilibre-app-leaves.cjs /tmp/utilibre-spliit-privacy.cjs
USER ${FINAL_USER}
FROM ${BASE} AS privacy-rollback
USER root
ARG TARGET
ARG FINAL_USER
COPY spliit-privacy.cjs /tmp/utilibre-spliit-privacy.cjs
RUN node /tmp/utilibre-spliit-privacy.cjs "$TARGET" && rm /tmp/utilibre-spliit-privacy.cjs
USER ${FINAL_USER}
FROM ${BASE} AS zip-runtime
USER root
ARG TARGET
ARG FINAL_USER
COPY --from=leaves /reviewed/node_modules/adm-zip /opt/utilibre-app-reviewed-leaves/node_modules/adm-zip
COPY replace.cjs /tmp/utilibre-app-leaves.cjs
RUN node /tmp/utilibre-app-leaves.cjs "$TARGET" adm-zip 0.6.0 0.6.1 && rm /tmp/utilibre-app-leaves.cjs
USER ${FINAL_USER}
