#!/bin/sh
# In the same isolated compiler as build-mongocrypt.sh; network disabled.
# Default writes the native verifier's inputs. /output/replay preserves an
# earlier release's immutable proof while checking the test runner itself.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
test "$#" -le 1
out=${1:-/output}
case "$out" in /output|/output/replay) ;; *) exit 2 ;; esac
mkdir -p "$out"
test ! -e "$out/native-suite.log"
test ! -e "$out/regression-before-duplicate.log"
test ! -e "$out/regression-before-kek.log"
ulimit -c 0
ulimit -t 120
cd /work/candidate
set +e
timeout 180 obj-x86_64-linux-gnu/test-mongocrypt > "$out/native-suite.log" 2>&1
code=$?
set -e
printf '%s\n' "$code" > "$out/native-suite.exit"
test "$code" -eq 0
cd /work/baseline
for kind in duplicate kek; do
 case "$kind" in
  duplicate) name=test_mongocrypt_key_parsing_duplicate_master_key ;;
  kek) name=test_mongocrypt_kek_parse_failure_leaves_kek_intact ;;
 esac
 set +e
 timeout 30 build/test-mongocrypt "$name" > "$out/regression-before-$kind.log" 2>&1
 code=$?
 set -e
 printf '%s\n' "$code" > "$out/regression-before-$kind.exit"
 test "$code" -eq 134
done
# mongocrypt-native.mjs checks both exact baseline failure messages, the complete
# successful test list, package ABI, source scope and recorded input checksums.
