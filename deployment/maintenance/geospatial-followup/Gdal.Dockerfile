ARG BASE
FROM ${BASE}
COPY libgdal32_3.6.2+dfsg-1+utilibre1_amd64.deb /tmp/utilibre-gdal-native.deb
RUN dpkg -i /tmp/utilibre-gdal-native.deb \
 && test -z "$(dpkg --audit)" \
 && rm /tmp/utilibre-gdal-native.deb
COPY gdal_3.6.2+dfsg-1+utilibre1.dsc gdal_3.6.2+dfsg-1+utilibre1.debian.tar.xz gdal_3.6.2+dfsg.orig.tar.xz /usr/local/share/gdal-security/
