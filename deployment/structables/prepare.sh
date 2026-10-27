#!/bin/sh
# Explicit preparation only. Does not run, publish or replace a service.
set -eu
task_root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
task_output=${1:?Supply a new absolute candidate directory}
case "$task_output" in /*) ;; *) echo 'Use an absolute directory' >&2; exit 1;; esac
[ ! -e "$task_output" ] || { echo 'Candidate directory already exists' >&2; exit 1; }
mkdir -m 700 "$task_output"
task_revision=4f10ce078543685db88d8ed57606aaa14fae84d9
git -c core.hooksPath=/dev/null clone --no-checkout https://git.private.coffee/PrivateCoffee/structables.git "$task_output/source"
git -C "$task_output/source" -c core.hooksPath=/dev/null checkout --detach "$task_revision"
[ "$(git -C "$task_output/source" rev-parse HEAD)" = "$task_revision" ]
(cd "$task_root" && sha256sum -c inputs.sha256)
git -C "$task_output/source" apply --check --whitespace=error "$task_root/upstream.patch"
git -C "$task_output/source" apply --whitespace=error "$task_root/upstream.patch"
for task_file in Dockerfile requirements.lock safe_http.py wsgi.py; do
    cp "$task_root/$task_file" "$task_output/$task_file"
done
task_base=python:3.14-alpine3.24@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2
# Pinned download phase, then a network-disabled build. Runtime has no pip.
docker run --rm --memory 512m --cpus 1 --pids-limit 96 \
    -v "$task_output:/build" -w /build "$task_base" \
    pip download --only-binary=:all: --require-hashes -r requirements.lock --dest wheels
docker build --network none -t utilibre-structables:0.4.5-p1-20261027 "$task_output"
docker run --rm --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --memory 384m --cpus 1 \
    --tmpfs /tmp:rw,nosuid,nodev,noexec,size=32m \
    -v "$task_root/test_policy.py:/app/test_policy.py:ro" \
    --entrypoint python utilibre-structables:0.4.5-p1-20261027 /app/test_policy.py
echo 'Prepared and tested. Public activation requires the reading/media and edge checks in README.md.'
