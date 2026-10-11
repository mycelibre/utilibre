FROM rust:1.96.0-alpine3.23@sha256:5dc2af9dd547c33f64d5fc1d299ab93b51f39eaa16c426c476b990ce6caf5b3e AS audit-toolchain
RUN apk add --no-cache build-base=0.5-r3 musl-dev=1.2.5-r23
ADD --checksum=sha256:7676443367c5e33d9fb22acef63cccb5e9202de12dae1b0579995eb3e2bc7a18 https://github.com/rust-secure-code/cargo-auditable/releases/download/v0.7.7/cargo-auditable-x86_64-unknown-linux-musl.tar.xz /tmp/cargo-auditable.tar.xz
RUN tar -xJf /tmp/cargo-auditable.tar.xz -C /tmp && \
    install -m 755 /tmp/cargo-auditable-x86_64-unknown-linux-musl/cargo-auditable /usr/local/bin/ && \
    mkdir -p /usr/local/share/licenses/cargo-auditable && \
    cp /tmp/cargo-auditable-x86_64-unknown-linux-musl/LICENSE-* /usr/local/share/licenses/cargo-auditable/ && \
    rm -rf /tmp/cargo-auditable-x86_64-unknown-linux-musl /tmp/cargo-auditable.tar.xz
FROM audit-toolchain AS build
WORKDIR /src
COPY backend ./
ENV CARGO_BUILD_JOBS=2
RUN cargo auditable test --locked --release && cargo auditable build --locked --release
FROM scratch
COPY --from=build /src/target/release/chhoto-url /app/chhoto-url
COPY frontend /app/frontend/base
WORKDIR /app
USER 65534:65534
ENTRYPOINT ["/app/chhoto-url"]
