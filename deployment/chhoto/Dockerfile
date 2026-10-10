FROM rust:1.96.0-alpine3.23@sha256:5dc2af9dd547c33f64d5fc1d299ab93b51f39eaa16c426c476b990ce6caf5b3e AS build
RUN apk add --no-cache build-base
WORKDIR /src
COPY backend ./
ENV CARGO_BUILD_JOBS=2
RUN cargo test --locked && cargo build --locked --release
FROM scratch
COPY --from=build /src/target/release/chhoto-url /app/chhoto-url
COPY frontend /app/frontend/base
WORKDIR /app
USER 65534:65534
ENTRYPOINT ["/app/chhoto-url"]
