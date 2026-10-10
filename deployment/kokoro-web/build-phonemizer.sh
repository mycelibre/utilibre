#!/bin/sh
set -eu
# Run in the pinned builder with /source, /work and /toolchain mounts.
# Toolchain: Emscripten3.1.64, release fd61bacaf40131f74987e649a135f1dd559aff60.
# Source: eSpeakNG1.52.0, 4870adfa25b1a32b4361592f1be8a40337c58d6c.
export EM_CONFIG=/work/emscripten-config
export PATH="/toolchain/emscripten:$PATH"
cat > "$EM_CONFIG" <<'CONFIG'
LLVM_ROOT = '/toolchain/bin'
BINARYEN_ROOT = '/toolchain'
EMSCRIPTEN_ROOT = '/toolchain/emscripten'
NODE_JS = ['/usr/local/bin/node']
CACHE = '/work/emscripten-cache'
CONFIG
cmake -S /source -B /work/native -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr -DUSE_ASYNC=OFF -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF -DUSE_KLATT=OFF -DUSE_SPEECHPLAYER=OFF -DBUILD_TESTING=OFF
cmake --build /work/native --parallel 2 --target data
emcmake cmake -S /source -B /work/wasm -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr -DUSE_ASYNC=OFF -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF -DUSE_KLATT=OFF -DUSE_SPEECHPLAYER=OFF -DBUILD_TESTING=OFF '-DCMAKE_EXE_LINKER_FLAGS=-sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=ESpeakNg -sEXPORTED_RUNTIME_METHODS=FS -sALLOW_MEMORY_GROWTH=1 -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=0 --embed-file /work/native/espeak-ng-data@/usr/share/espeak-ng-data'
cmake --build /work/wasm --parallel 2 --target espeak-ng-bin
mkdir -p /work/output
cp /work/wasm/src/espeak-ng.js /work/wasm/src/espeak-ng.wasm /work/output/
sha256sum /work/output/*
