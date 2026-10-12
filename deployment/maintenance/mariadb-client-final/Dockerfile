# Same Coturn binary; only two signed Debian client-library/config packages.
# Build wrapper must verify this local base's exact image ID before building.
FROM utilibre-coturn:4.18.0-minimal-native-20261011
USER root
COPY libmariadb3.deb mariadb-common.deb /tmp/reviewed-client/
RUN echo 'bed52f526f58a2312a35c728463cc657834da57e942aba2fe38234eab7813e19  /tmp/reviewed-client/libmariadb3.deb' | sha256sum -c - \
 && echo '411a5b285887383d8fe8d2b77f81153876b513dabc10321fa22725bdfd24d1e0  /tmp/reviewed-client/mariadb-common.deb' | sha256sum -c - \
 && test "$(dpkg-query -W -f='${Version}' libmariadb3)" = '1:11.8.6-0+deb13u1' \
 && test "$(dpkg-query -W -f='${Version}' mariadb-common)" = '1:11.8.6-0+deb13u1' \
 && dpkg --install /tmp/reviewed-client/mariadb-common.deb /tmp/reviewed-client/libmariadb3.deb \
 && test -z "$(dpkg --audit)" \
 && test "$(dpkg-query -W -f='${Version}' libmariadb3)" = '1:11.8.9+ds-4' \
 && test "$(dpkg-query -W -f='${Version}' mariadb-common)" = '1:11.8.9+ds-4' \
 && echo '7d7706104f48524ccc19636fc3dcad46de563267b84641d335c1376ea0272dfc  /usr/bin/turnserver' | sha256sum -c - \
 && ! ldd /usr/bin/turnserver | grep 'not found' \
 && rm /tmp/reviewed-client/libmariadb3.deb /tmp/reviewed-client/mariadb-common.deb
USER 65534:65534
