# syntax=docker/dockerfile:1.18@sha256:dabfc0969b935b2080555ace70ee69a5261af8a8f1b4df97b9e7fbcf6722eddf

# This follows upstream Dockerfile.ubuntu at the pinned commit, while fetching
# an immutable source archive and applying the repository's documented patch.
ARG RUST_BUILDER_VERSION=slim-bookworm@sha256:1469a27c125cb5a3aebfa4f4e4665d935b02fb72cc093b2c974b3d740e43f157
ARG UBUNTU_RELEASE_VERSION=noble@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517

FROM rust:${RUST_BUILDER_VERSION} AS builder

RUN apt-get update \
    && apt-get -y install --no-install-recommends git build-essential cmake libclang-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /redlib

ADD --checksum=sha256:618c22a7ff586ae0954101a70b2d71b7b9e4877a2a73cee317222a431bcd7b37 \
    https://github.com/redlib-org/redlib/archive/a4d36e954cf1bd64f209cd8868c5a29edc81b374.tar.gz \
    /tmp/redlib.tar.gz
RUN tar -xzf /tmp/redlib.tar.gz --strip-components=1 -C /redlib \
    && rm /tmp/redlib.tar.gz

COPY patches/0001-reject-scheme-relative-settings-redirects.patch /tmp/redlib-security.patch
RUN --mount=type=cache,id=redlib-cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=redlib-target,target=/redlib/target \
    git apply --check /tmp/redlib-security.patch \
    && git apply /tmp/redlib-security.patch \
    && cargo test --release --locked redirect_tests::permits_only_local_absolute_paths \
    && cargo build --release --locked --bin redlib \
    && cp /redlib/target/release/redlib /tmp/redlib

FROM ubuntu:${UBUNTU_RELEASE_VERSION} AS release

COPY --from=builder /tmp/redlib /usr/local/bin/redlib

RUN useradd \
    --no-create-home \
    --password "!" \
    --comment "user for running redlib" \
    redlib

USER redlib
EXPOSE 8080

LABEL org.opencontainers.image.source="https://github.com/redlib-org/redlib" \
      org.opencontainers.image.revision="a4d36e954cf1bd64f209cd8868c5a29edc81b374" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.title="Redlib (public utility patched build)" \
      org.opencontainers.image.version="0.36.0-a4d36e9-p1"

CMD ["redlib"]
