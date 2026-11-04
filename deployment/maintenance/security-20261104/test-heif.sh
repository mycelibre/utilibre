#!/bin/sh
# Replay only in the disconnected, bounded compiler, never a service container.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
out=${1:-/output/metadata-replay}
case "$out" in /output/metadata-replay) ;; *) exit 2 ;; esac
test ! -e "$out"
mkdir "$out"
ulimit -c 0
g++ -O2 -DLEGACY_WRITER /work/heif-metadata.cc -lheif -o "$out/legacy-writer"
g++ -O2 -I/work/source/libheif/api -I/work/build /work/heif-metadata.cc \
 -L/work/build/libheif -Wl,-rpath,/work/build/libheif -lheif -o "$out/reader"
timeout 15 "$out/legacy-writer" /work/fictional.heic "$out/legacy-metadata.heic" > "$out/legacy-writer.log" 2>&1
timeout 15 "$out/reader" /work/fictional.heic "$out/metadata.heic" > "$out/new-writer.log" 2>&1
timeout 15 "$out/reader" /work/fictional.heic "$out/legacy-metadata.heic" read > "$out/legacy-reader.log" 2>&1
python3 /work/heif-metadata-fixtures.py "$out"
timeout 15 "$out/reader" /work/fictional.heic "$out/metadata-raw.heic" read > "$out/raw.log" 2>&1
timeout 15 "$out/reader" /work/fictional.heic "$out/metadata-bad-checksum.heic" reject > "$out/checksum.log" 2>&1
timeout 15 "$out/reader" /work/fictional.heic "$out/metadata-bad-header.heic" reject > "$out/header.log" 2>&1
printf '%s\n' 'Old/new metadata, limits, raw DEFLATE and corrupt input checks passed.'
