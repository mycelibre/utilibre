ARG BASE
FROM ${BASE}
USER root
RUN test "$(sha256sum /usr/lib/x86_64-linux-gnu/libheif.so.1 | cut -d' ' -f1)" = 92490d4adeb12215ed647de8e1eabc5cc315582eff9cbad55f09b70f29e2ecc9 \
 && test "$(sha256sum /opt/imagick/lib/deps/libheif.so.1 | cut -d' ' -f1)" = 8f1d6e3e7966ccc7fd9f5168706e5c92c71ff8934c55236f421b9c52cc16634c \
 && cp -L /usr/lib/x86_64-linux-gnu/libheif.so.1 /opt/imagick/lib/deps/libheif.so.1
ARG RESTORE_USER=root
USER ${RESTORE_USER}
