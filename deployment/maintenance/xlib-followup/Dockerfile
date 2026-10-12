ARG BASE
FROM ${BASE}
ARG RESTORE_USER=root
ARG PRIVATE_COPIES=0
USER root
COPY packages/ /tmp/utilibre-xlib-packages/
RUN dpkg --install /tmp/utilibre-xlib-packages/*.deb \
 && test -z "$(dpkg --audit)" \
 && if test "$PRIVATE_COPIES" = 1; then \
      test -f /opt/imagick/lib/deps/libX11.so.6 \
      && test -f /opt/imagick/lib/deps/libXrender.so.1 \
      && cp -L /usr/lib/x86_64-linux-gnu/libX11.so.6 /opt/imagick/lib/deps/libX11.so.6 \
      && cp -L /usr/lib/x86_64-linux-gnu/libXrender.so.1 /opt/imagick/lib/deps/libXrender.so.1; \
    fi \
 && rm -r /tmp/utilibre-xlib-packages
USER ${RESTORE_USER}
