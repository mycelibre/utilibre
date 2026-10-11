FROM coturn/coturn:4.18.0-r0@sha256:bbefd3e1fdfdc0d58770fe01b581fd8b00d9f3a5580d00acb77cf719a6bc78e3
USER root
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends upgrade && apt-get clean && rm -rf /var/lib/apt/lists/*
# High-numbered ports need no bind capability. Remove upstream file capability
# so the binary executes with a fully dropped bounding set/no-new-privileges.
RUN cp --no-preserve=xattr /usr/bin/turnserver /tmp/turnserver && mv /tmp/turnserver /usr/bin/turnserver
USER 65534:65534
