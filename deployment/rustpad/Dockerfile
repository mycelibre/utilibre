FROM scratch
COPY rustpad-server /rustpad-server
COPY dist /dist
USER 1000:1000
ENV PORT=3030 EXPIRY_DAYS=1 RUST_LOG=error
EXPOSE 3030
ENTRYPOINT ["/rustpad-server"]
