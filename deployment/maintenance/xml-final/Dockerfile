ARG BASE
FROM ${BASE}
ARG RESTORE_USER=root
USER root
COPY packages/ /tmp/utilibre-xml-packages/
RUN dpkg --install /tmp/utilibre-xml-packages/*.deb \
 && test -z "$(dpkg --audit)" \
 && rm -r /tmp/utilibre-xml-packages
USER ${RESTORE_USER}
