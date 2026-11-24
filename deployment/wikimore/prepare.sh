#!/bin/sh
# Explicit candidate preparation only; never activates a public route.
set -eu
task_root=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
task_output=${1:?Supply a new absolute candidate directory}
case "$task_output" in /*) ;; *) echo 'Use an absolute directory' >&2; exit 1;; esac
[ ! -e "$task_output" ] || { echo 'Candidate directory already exists' >&2; exit 1; }
mkdir -m 700 "$task_output"
task_revision=70b39146f36f54317ccda71fcc007caa5a555a1e
git -c core.hooksPath=/dev/null clone --no-checkout https://git.private.coffee/PrivateCoffee/wikimore.git "$task_output/source"
git -C "$task_output/source" -c core.hooksPath=/dev/null checkout --detach "$task_revision"
[ "$(git -C "$task_output/source" rev-parse HEAD)" = "$task_revision" ]
(cd "$task_root" && sha256sum -c inputs.sha256)
"$task_root/../reference-readers/fetch-alpine-packages.sh" "$task_output"
git -C "$task_output/source" apply --check --whitespace=error "$task_root/upstream.patch"
git -C "$task_output/source" apply --whitespace=error "$task_root/upstream.patch"
for task_file in Dockerfile requirements.lock requirements.build.lock media.py wsgi.py; do
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
curl -fsSL --max-time 30 https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz -o "$task_output/leaflet.tgz"
(cd "$task_output" && printf '%s  leaflet.tgz\n' '84c65a256e50657896f54c33bd857b6849ebe94c817803be818bf32a3dde0b77' | sha256sum -c -)
mkdir -p "$task_output/leaflet"
tar -xzf "$task_output/leaflet.tgz" -C "$task_output/leaflet" --strip-components=2 \
    package/dist/leaflet.js package/dist/leaflet.css package/dist/images
tar -xOzf "$task_output/leaflet.tgz" package/LICENSE > "$task_output/leaflet/LICENSE"
docker build --network none -t utilibre-wikimore:0.1.27-p1-20261124 "$task_output"
docker run --rm --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --memory 384m --cpus 1 \
    --tmpfs /tmp:rw,nosuid,nodev,noexec,size=24m \
    -v "$task_root/test_policy.py:/app/test_policy.py:ro" \
    --entrypoint python utilibre-wikimore:0.1.27-p1-20261124 /app/test_policy.py
echo 'Prepared and tested. Public activation requires search/article/media and edge checks in README.md.'
