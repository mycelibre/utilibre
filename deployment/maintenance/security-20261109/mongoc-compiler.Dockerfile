# Local compiler overlay only; verify every package hash in mongoc-inputs.json.
# Use DOCKER_BUILDKIT=0 so FROM is the exact locally retained image ID.
FROM sha256:9da66c3f0c1d9306b11cf13c883c78889fcb54ff317c92a53848f327053d3156
COPY *.deb /opt/compiler-inputs/
RUN for package in /opt/compiler-inputs/*.deb; do dpkg-deb -x "$package" /; done && rm -rf /opt/compiler-inputs
