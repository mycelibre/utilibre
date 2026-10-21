FROM privatebin/nginx-fpm-alpine:2.1.0@sha256:b221c93dea1610380c5a64ca0318d1447f5197f7a4fc790467eb14e25eb15ba7
USER root
# Signed Alpine fixes, exact package bytes. No moving apk indexes during replay.
ADD --checksum=sha256:016efc189c6d566061ffe206ed0780e32686c1a8c832a3917d35d2c66d61a40f https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/libx11-1.8.14-r0.apk /tmp/libx11.apk
ADD --checksum=sha256:1ed312a00abac5a5840c1f3721921ea8183e664566c19763ed00aa9f35bb2178 https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/libxpm-3.5.20-r0.apk /tmp/libxpm.apk
RUN apk add --no-network /tmp/libx11.apk /tmp/libxpm.apk && rm /tmp/libx11.apk /tmp/libxpm.apk
COPY prepare.php /tmp/utilibre-privatebin-security.php
RUN php /tmp/utilibre-privatebin-security.php && php -l /srv/lib/Configuration.php && rm /tmp/utilibre-privatebin-security.php
USER 65534:82
