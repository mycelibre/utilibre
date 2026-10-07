FROM coturn/coturn:4.7.0@sha256:a00afb5b4890de4df22bbe70379c6b316685dffee297d53cac1271dcb91fab93
USER root
# High-numbered ports need no bind capability. Remove upstream file capability
# so the binary executes with a fully dropped bounding set/no-new-privileges.
RUN cp --no-preserve=xattr /usr/bin/turnserver /tmp/turnserver && mv /tmp/turnserver /usr/bin/turnserver
USER 65534:65534
