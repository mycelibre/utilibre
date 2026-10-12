ARG BASE
FROM ${BASE}
USER root
COPY packages/xserver-common_2%3a21.1.25-1_all.deb packages/xvfb_2%3a21.1.25-1_amd64.deb /tmp/utilibre-xserver/
RUN dpkg --install /tmp/utilibre-xserver/xserver-common_2%3a21.1.25-1_all.deb /tmp/utilibre-xserver/xvfb_2%3a21.1.25-1_amd64.deb \
 && test -z "$(dpkg --audit)"
USER penpot:penpot
