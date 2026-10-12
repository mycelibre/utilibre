# Exact base identity is verified by the build/check wrapper before building.
FROM utilibre-gathio-documentdb:17.11-0.107.0-sqlite-security-20261011
COPY libaom3_3.14.1-1_amd64.deb /tmp/libaom3-reviewed.deb
RUN echo '8f932e686c8a0e3e09ef211b924bac0a43d3d6fd774e0dfbeba9c301aa129fca  /tmp/libaom3-reviewed.deb' | sha256sum -c - \
 && test "$(dpkg-query -W -f='${Version}' libaom3)" = '3.6.0-1+deb12u3' \
 && dpkg --install /tmp/libaom3-reviewed.deb \
 && test -z "$(dpkg --audit)" \
 && test "$(dpkg-query -W -f='${Version}' libaom3)" = '3.14.1-1' \
 && rm /tmp/libaom3-reviewed.deb
