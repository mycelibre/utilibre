ARG BASE
FROM ${BASE}
ARG RESTORE_USER
USER root
# These four immutable Node runtimes never use APT. Keep their build-capable
# base image for future native updates, then reapply this final runtime layer.
# dpkg enforces dependencies: no --force-depends or fabricated inventory.
RUN dpkg --remove apt libgnutls30 \
 && test -z "$(dpkg --audit)" \
 && test "$(dpkg-query -W -f='${Status}' dpkg)" = 'install ok installed' \
 && ! command -v apt-get \
 && ! test -e /usr/lib/x86_64-linux-gnu/libgnutls.so.30 \
 && ! test -e /lib/x86_64-linux-gnu/libgnutls.so.30
USER ${RESTORE_USER}
