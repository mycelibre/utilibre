# BASE is the exact locally verified, previously deployed parent. Only the static
# privilege-drop helper and its licensing/build evidence are changed.
ARG BASE
FROM ${BASE}
COPY gosu /usr/local/bin/gosu
COPY notices/ /usr/local/share/gosu-security/
