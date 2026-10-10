#!/bin/sh
# Inputs: clean pinned backend and frontend source directories. Uses bounded tmpfs build caches.
set -eu
recipe=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
backend=$(realpath "${1:?backend source directory}")
frontend=$(realpath "${2:?frontend source directory}")
out=$(realpath "${3:?empty output directory}")
git -C "$backend" apply "$recipe/backend.patch"
git -C "$frontend" apply "$recipe/frontend.patch"
cp "$recipe/asset-boundary-test.go" "$backend/internal/storage/utilibre_boundary_test.go"
cp "$recipe/SanitizeHtml.js" "$frontend/src/utils/SanitizeHtml.js"
node_image=node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a
docker run --rm --cpus 2 --memory 4g --memory-swap 4g --tmpfs /src/node_modules:rw,exec,size=1600m --tmpfs /root/.npm:rw,noexec,size=600m --tmpfs /tmp:rw,exec,size=256m -v "$frontend:/src" -w /src "$node_image" sh -ec 'npm ci --ignore-scripts; npm rebuild esbuild @swc/core; npx patch-package; VITE_APP_API_URL= VITE_APP_REDIRECT_URL=https://chores.utilibre.org VITE_APP_GOOGLE_CLIENT_ID= VITE_IS_SELF_HOSTED=true VITE_IS_LANDING_DEFAULT=false VITE_POSTHOG_KEY= VITE_POSTHOG_HOST= VITE_OPENREPLAY_PROJECT_KEY= POSTHOG_UPLOAD_SOURCEMAPS=false npx vite build --mode selfhosted'
cp -a "$frontend/dist/." "$backend/frontend/dist/"
docker run --rm --cpus 2 --memory 8g --memory-swap 8g --tmpfs /go/pkg:rw,exec,size=3g --tmpfs /root/.cache:rw,exec,size=2400m --tmpfs /tmp:rw,exec,size=1600m -e GOTOOLCHAIN=go1.27.2 -e GOTELEMETRY=off -v "$backend:/src" -v "$out:/out" -w /src golang:1.26-alpine@sha256:8ac98ca534ac3f51e1f420a1dd2c15e74c75cfa0f23f3ad27eb5d7236c349a0c sh -ec 'go test ./internal/storage ./internal/user ./internal/auth; CGO_ENABLED=0 go build -trimpath -buildvcs=false -ldflags="-s -w -X donetick.com/core/config.Version=0.1.80-utilibre-p3 -X donetick.com/core/config.Commit=e88d8bea62405ca02288f93dd70efab8c0f1ff2c -X donetick.com/core/config.BuildDate=2026-10-09" -o /out/donetick .; cp "$(go env GOROOT)/lib/time/zoneinfo.zip" /out/zoneinfo.zip'
docker build -t utilibre-donetick:0.1.80-p3 -f "$recipe/Dockerfile" "$out"
