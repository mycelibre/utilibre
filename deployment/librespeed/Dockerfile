FROM scratch
COPY speedtest /app/speedtest
USER 10001:10001
WORKDIR /app
ENTRYPOINT ["/app/speedtest", "-c", "/app/settings.toml"]
