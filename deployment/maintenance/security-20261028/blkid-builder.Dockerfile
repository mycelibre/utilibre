FROM golang:1.27.3-bookworm@sha256:e482b31b5d30c31f9e495f4b8cbdf41429b2d74955dfbcd9c0a904483d738390
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq && apt-get install -y --no-install-recommends autoconf automake libtool pkg-config gettext autopoint bison flex python3 debhelper dh-exec po-debconf && dpkg-query -W -f='${binary:Package}=${Version}\n' > /build-packages.lock
# Acquisition only. Source builds run later with --network none and this exact image ID.
