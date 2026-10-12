ARG BASE
FROM ${BASE}
ARG RESTORE_USER=root
USER root
COPY packages/ /tmp/utilibre-sqlite-packages/
RUN dpkg --install /tmp/utilibre-sqlite-packages/*.deb \
 && dpkg --audit \
 && rm -r /tmp/utilibre-sqlite-packages
USER ${RESTORE_USER}
