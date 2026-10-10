FROM rust:1.99.0-alpine3.24@sha256:0cce0a5e0e8ba67b455257a3a02a1d99005f382748789d6464460028810f1627
RUN apk add --no-cache musl-dev openssl-dev pkgconf git
COPY wasm-pack /usr/local/bin/wasm-pack
RUN rustup target add wasm32-unknown-unknown
ENV CARGO_BUILD_JOBS=2 CARGO_PROFILE_RELEASE_DEBUG=0
WORKDIR /work
