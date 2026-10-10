#!/bin/sh
set -eu
# A new, disposable build directory only. Never point at a live service volume.
recipe=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
build=${1:?Pass an empty task-specific build directory}
mkdir -p "$build"
[ -z "$(ls -A "$build")" ] || { echo 'Build directory must be empty' >&2; exit 1; }
git clone https://github.com/ekzhang/rustpad.git "$build/source"
git -C "$build/source" checkout 54e4a9383c84d7317af42a7ddb177ce8bcba058d
python3 "$recipe/apply-patches.py" "$build/source"
cat "$recipe/bounds-unit.rs" >> "$build/source/rustpad-server/src/rustpad.rs"
cp "$recipe/bounds-integration.rs" "$build/source/rustpad-server/tests/utilibre_bounds.rs"
cp "$recipe/Cargo.lock" "$build/source/Cargo.lock"
cp "$recipe/package-lock.json" "$build/source/package-lock.json"
mkdir "$build/tools" "$build/registry" "$build/output"
curl --fail --location --proto '=https' --tlsv1.2 --output "$build/tools/wasm-pack.tgz" https://github.com/wasm-bindgen/wasm-pack/releases/download/v0.15.0/wasm-pack-v0.15.0-x86_64-unknown-linux-musl.tar.gz
printf '%s  %s\n' c09f971ecaed9a2efc80fdcea7a00ef6b53c7fadc8c57d1f61b53a6aa66b668a "$build/tools/wasm-pack.tgz" | sha256sum -c -
tar -xzf "$build/tools/wasm-pack.tgz" -C "$build/tools" --strip-components=1
cp "$recipe/Builder.Dockerfile" "$build/tools/Dockerfile"
docker build -t utilibre-rustpad-builder:1.99.0 "$build/tools"
docker run --rm --memory 4g --cpus 2 --pids-limit 256 --tmpfs /work/target:rw,exec,size=2300m -v "$build/source:/work" -v "$build/registry:/usr/local/cargo/registry" -v "$build/output:/out" utilibre-rustpad-builder:1.99.0 sh -c 'cargo test --locked --release --workspace -- --test-threads=2 && cargo build --locked --release -p rustpad-server && cp target/release/rustpad-server /out/ && wasm-pack build rustpad-wasm --release --no-opt'
(cd "$build/source" && npm ci && npm run check && VITE_SHA=54e4a93-p1 npm run build)
cp -r "$build/source/dist" "$build/output/"
cp "$recipe/Dockerfile" "$build/output/"
docker build -t utilibre-rustpad:54e4a93-p1 "$build/output"
