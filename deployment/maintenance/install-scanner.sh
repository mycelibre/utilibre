#!/bin/sh
# Apache-2.0 Trivy, official release; no installer pipe or moving binary tag.
set -eu
umask 077
version=0.76.2
checksum=bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf
target=/opt/utilibre/maintenance/bin
stage=$(mktemp -d /tmp/utilibre-scanner-install-XXXXXX)
trap 'rm -f "$stage/release.tar.gz" "$stage/trivy" "$stage/LICENSE"; rmdir "$stage"' EXIT
curl --proto '=https' --tlsv1.2 -fL --retry 2 --max-time 180 \
  "https://github.com/aquasecurity/trivy/releases/download/v$version/trivy_${version}_Linux-64bit.tar.gz" -o "$stage/release.tar.gz"
printf '%s  %s\n' "$checksum" "$stage/release.tar.gz" | sha256sum -c -
tar -xzf "$stage/release.tar.gz" -C "$stage" trivy LICENSE
install -d -m 0755 "$target"
# Preserve the preceding executable for recorded assessments. Atomic activation
# avoids truncating a binary another scan may still be executing.
if [ -f "$target/trivy" ]; then
  previous=$(sha256sum "$target/trivy" | cut -d ' ' -f 1)
  if [ ! -e "$target/trivy-sha256-$previous" ]; then
    install -m 0755 "$target/trivy" "$target/trivy-sha256-$previous"
  fi
fi
install -m 0755 "$stage/trivy" "$target/trivy.new"
mv "$target/trivy.new" "$target/trivy"
install -m 0644 "$stage/LICENSE" "$target/TRIVY-LICENSE"
TRIVY_DISABLE_TELEMETRY=true TRIVY_SKIP_VERSION_CHECK=true "$target/trivy" --version
