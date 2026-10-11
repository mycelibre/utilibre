#!/bin/sh
# Apache-2.0 Trivy, official release; no installer pipe or moving binary tag.
set -eu
umask 077
version=0.75.0
checksum=c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f
target=/opt/utilibre/maintenance/bin
stage=$(mktemp -d /tmp/utilibre-scanner-install-XXXXXX)
trap 'rm -f "$stage/release.tar.gz" "$stage/trivy" "$stage/LICENSE"; rmdir "$stage"' EXIT
curl --proto '=https' --tlsv1.2 -fL --retry 2 --max-time 180 \
  "https://github.com/aquasecurity/trivy/releases/download/v$version/trivy_${version}_Linux-64bit.tar.gz" -o "$stage/release.tar.gz"
printf '%s  %s\n' "$checksum" "$stage/release.tar.gz" | sha256sum -c -
tar -xzf "$stage/release.tar.gz" -C "$stage" trivy LICENSE
install -d -m 0755 "$target"
install -m 0755 "$stage/trivy" "$target/trivy"
install -m 0644 "$stage/LICENSE" "$target/TRIVY-LICENSE"
TRIVY_DISABLE_TELEMETRY=true TRIVY_SKIP_VERSION_CHECK=true "$target/trivy" --version
