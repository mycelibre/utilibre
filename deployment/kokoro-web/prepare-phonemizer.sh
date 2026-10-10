#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/kokoro-espeak-source}
work_dir=${2:-/opt/utilibre/build/kokoro-espeak}
integration_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 4870adfa25b1a32b4361592f1be8a40337c58d6c ]
if git -C "$source_dir" apply --check --unidiff-zero "$integration_dir/phonemizer-source.patch" 2>/dev/null; then
 git -C "$source_dir" apply --unidiff-zero "$integration_dir/phonemizer-source.patch"
else
 git -C "$source_dir" apply --reverse --check --unidiff-zero "$integration_dir/phonemizer-source.patch"
fi
mkdir -p "$work_dir"
python3 - "$work_dir" <<'PY'
import hashlib,pathlib,sys,tarfile,urllib.request,shutil
work=pathlib.Path(sys.argv[1]);archive=work/'toolchain.tar.xz'
# Immutable release-build artifact, not the emsdk 'latest' alias.
url='https://storage.googleapis.com/webassembly/emscripten-releases-builds/linux/fd61bacaf40131f74987e649a135f1dd559aff60/wasm-binaries.tar.xz'
if not archive.exists():
 with urllib.request.urlopen(url,timeout=120) as response,archive.open('wb') as output:shutil.copyfileobj(response,output)
assert archive.stat().st_size==301536980
assert hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()=='c39de24beca60fd580f6dff0eca0e275016042a30234588b19eda82397e299f3'
if not (work/'install/emscripten/emcc').exists():
 with tarfile.open(archive) as bundle:
  assert sum(item.size for item in bundle)<1400000000
  bundle.extractall(work,filter='data')
archive.unlink()
PY
docker build -t utilibre-kokoro-phonemizer-build:1.52.0 -f "$integration_dir/Dockerfile.phonemizer" "$integration_dir"
docker run --rm --network none --memory 1g --cpus 2 \
 -v "$source_dir:/source:ro" -v "$work_dir:/work" -v "$work_dir/install:/toolchain:ro" \
 -v "$(command -v node):/usr/local/bin/node:ro" -v "$integration_dir/build-phonemizer.sh:/build.sh:ro" \
 utilibre-kokoro-phonemizer-build:1.52.0 sh /build.sh
