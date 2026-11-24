#!/bin/sh
# Explicit candidate preparation. Does not activate or publish a service.
set -eu
task_root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
task_output=${1:?Supply a new absolute candidate directory}
case "$task_output" in /*) ;; *) echo 'Use an absolute directory' >&2; exit 1;; esac
[ ! -e "$task_output" ] || { echo 'Candidate directory already exists' >&2; exit 1; }
mkdir -m 700 "$task_output"
task_revision=0418035548a5d42f6252621514cd0949a7845b1b
git -c core.hooksPath=/dev/null clone --no-checkout https://github.com/kmille/freetar.git "$task_output/source"
git -C "$task_output/source" -c core.hooksPath=/dev/null checkout --detach "$task_revision"
[ "$(git -C "$task_output/source" rev-parse HEAD)" = "$task_revision" ]
(cd "$task_root" && sha256sum -c inputs.sha256)
"$task_root/../reference-readers/fetch-alpine-packages.sh" "$task_output"
git -C "$task_output/source" apply --check --whitespace=error "$task_root/upstream.patch"
git -C "$task_output/source" apply --whitespace=error "$task_root/upstream.patch"
for task_file in Dockerfile requirements.lock requirements.build.lock wsgi.py; do
    cp "$task_root/$task_file" "$task_output/$task_file"
done
task_base=python:3.14-alpine3.24@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2
docker run --rm --memory 768m --cpus 1 --pids-limit 96 \
    -v "$task_output:/build" -w /build "$task_base" \
    pip download --only-binary=:all: --require-hashes -r requirements.lock -r requirements.build.lock --dest wheels
docker run --rm --network none --memory 768m --cpus 1 --pids-limit 96 \
    -v "$task_output:/build" -w /build "$task_base" sh -ec '
        pip install --no-index --find-links=wheels --require-hashes -r requirements.build.lock
        pip wheel --no-deps --no-build-isolation --no-index --wheel-dir wheels ./source
    '
docker build --network none -t utilibre-freetar:0.22.0-p1-20261124 "$task_output"
docker run --rm --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --memory 256m --cpus 0.75 \
    --tmpfs /tmp:rw,nosuid,nodev,noexec,size=16m \
    -e FREETAR_LOCAL=1 -e FREETAR_CACHING=off \
    -v "$task_root/test_policy.py:/app/test_policy.py:ro" \
    --entrypoint python utilibre-freetar:0.22.0-p1-20261124 /app/test_policy.py
echo 'Prepared and tested. Public activation requires the native search/tab and edge checks in README.md.'
