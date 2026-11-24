#!/bin/sh
# Fetch only the fixed, reviewed Alpine 3.24 amd64 packages for offline builds.
set -eu
task_root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
task_output=${1:?Supply an existing candidate directory}
[ -d "$task_output" ] || { echo 'Candidate directory missing' >&2; exit 1; }
mkdir -m 700 "$task_output/os-packages"
for task_package in libcrypto3-3.5.9-r1.apk libssl3-3.5.9-r1.apk zlib-1.4-r0.apk; do
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
        --max-time 45 --retry 2 --retry-delay 1 \
        "https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/$task_package" \
        -o "$task_output/os-packages/$task_package"
done
(cd "$task_output/os-packages" && sha256sum -c "$task_root/alpine-3.24-amd64.sha256")
