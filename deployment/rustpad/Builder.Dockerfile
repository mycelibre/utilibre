FROM rust:1.99.0-alpine3.24@sha256:0cce0a5e0e8ba67b455257a3a02a1d99005f382748789d6464460028810f1627 AS audit-toolchain
RUN apk add --no-cache musl-dev=1.2.6-r2 openssl-dev=3.5.9-r0 pkgconf=2.5.1-r0 git=2.54.0-r0
ADD --checksum=sha256:7676443367c5e33d9fb22acef63cccb5e9202de12dae1b0579995eb3e2bc7a18 https://github.com/rust-secure-code/cargo-auditable/releases/download/v0.7.7/cargo-auditable-x86_64-unknown-linux-musl.tar.xz /tmp/cargo-auditable.tar.xz
RUN tar -xJf /tmp/cargo-auditable.tar.xz -C /tmp && \
    install -m 755 /tmp/cargo-auditable-x86_64-unknown-linux-musl/cargo-auditable /usr/local/bin/ && \
    mkdir -p /usr/local/share/licenses/cargo-auditable && \
    cp /tmp/cargo-auditable-x86_64-unknown-linux-musl/LICENSE-* /usr/local/share/licenses/cargo-auditable/ && \
    rm -rf /tmp/cargo-auditable-x86_64-unknown-linux-musl /tmp/cargo-auditable.tar.xz
ENV CARGO_BUILD_JOBS=2 CARGO_PROFILE_RELEASE_DEBUG=0
FROM audit-toolchain AS wasm-toolchain
COPY wasm-pack /usr/local/bin/wasm-pack
RUN rustup target add wasm32-unknown-unknown
WORKDIR /work
