ARG BASE
FROM ${BASE}
COPY postgresql-17-postgis-3_3.6.0+dfsg-3.pgdg12+1+utilibre1_amd64.deb /tmp/utilibre-postgis-native.deb
RUN dpkg -i /tmp/utilibre-postgis-native.deb \
 && test -z "$(dpkg --audit)" \
 && rm /tmp/utilibre-postgis-native.deb
COPY postgis_3.6.0+dfsg-3.pgdg12+1+utilibre1.dsc postgis_3.6.0+dfsg-3.pgdg12+1+utilibre1.debian.tar.xz postgis_3.6.0+dfsg.orig.tar.xz /usr/local/share/postgis-security/
