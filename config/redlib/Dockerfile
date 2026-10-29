# syntax=docker/dockerfile:1.18@sha256:dabfc0969b935b2080555ace70ee69a5261af8a8f1b4df97b9e7fbcf6722eddf
# Verify REDLIB_RUNTIME against recipe.json before building. It preserves the
# existing native security repairs; bare Ubuntu is not an equivalent base.
ARG RUST_BUILDER_VERSION=slim-bookworm@sha256:1469a27c125cb5a3aebfa4f4e4665d935b02fb72cc093b2c974b3d740e43f157
ARG REDLIB_RUNTIME=utilibre-redlib:graphql-e48efd8-20261024
FROM rust:${RUST_BUILDER_VERSION} AS builder
RUN apt-get update && apt-get -y install --no-install-recommends git build-essential cmake libclang-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /redlib
ADD --checksum=sha256:919ed133e2e7d65ef83061456f203ccf052057148f256d77594a232be91221e9 \
    https://codeload.github.com/polak14/redlib/tar.gz/29f18352cf54be4ffe579f773552acd0c45cdd08 /tmp/redlib.tar.gz
RUN tar -xzf /tmp/redlib.tar.gz --strip-components=1 -C /redlib && rm /tmp/redlib.tar.gz
COPY patches/ /tmp/patches/
ENV REDLIB_BUILD_REVISION=29f18352cf54be4ffe579f773552acd0c45cdd08
RUN set -eu; for patch in /tmp/patches/*.patch; do git apply --check "$patch"; git apply "$patch"; done
RUN --mount=type=cache,id=redlib-graphql-cargo,target=/usr/local/cargo/registry cargo fetch --locked
RUN --network=none --mount=type=cache,id=redlib-graphql-cargo,target=/usr/local/cargo/registry \
    --mount=type=cache,id=redlib-graphql-target,target=/redlib/target \
    rustc --test build.rs -o /tmp/build-tests && /tmp/build-tests \
    && cargo test --offline --locked --lib gql::tests \
    && cargo test --offline --locked --lib gql_feed::tests \
    && cargo test --offline --locked --lib redirect_tests \
    && cargo test --offline --locked --lib utils::tests::test_format_url \
    && cargo build --offline --locked --release --bin redlib \
    && cp target/release/redlib /tmp/redlib
FROM ${REDLIB_RUNTIME} AS release
COPY --from=builder /tmp/redlib /usr/local/bin/redlib
LABEL org.opencontainers.image.source="https://github.com/polak14/redlib" \
      org.opencontainers.image.revision="29f18352cf54be4ffe579f773552acd0c45cdd08" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.title="Redlib (Utilibre reviewed GraphQL build)" \
      org.opencontainers.image.version="0.36.0-29f1835-utilibre.1"
# USER, CMD and the maintained native libraries are inherited unchanged.
