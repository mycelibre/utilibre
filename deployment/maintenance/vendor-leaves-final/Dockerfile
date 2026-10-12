ARG BASE_IMAGE
FROM ${BASE_IMAGE}
ARG RUNTIME_USER
USER root
COPY libpcre2-8-0.deb /tmp/utilibre-pcre2-vendor.deb
RUN test "$(dpkg-query -W -f='${Version}' libpcre2-8-0)" = '10.46-1~deb13u2' \
 && dpkg -i /tmp/utilibre-pcre2-vendor.deb \
 && test "$(dpkg-query -W -f='${Version}' libpcre2-8-0)" = '10.46-1~deb13u3' \
 && test -z "$(dpkg --audit)" \
 && rm /tmp/utilibre-pcre2-vendor.deb
USER ${RUNTIME_USER}
