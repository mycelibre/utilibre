#!/bin/sh
# Rebuild only the pinned same-version extension. Never installs or deploys it.
set -eu
umask 077
test "$#" -eq 1
OUT=$1
case "$OUT" in /*) ;; *) exit 2 ;; esac
test ! -e "$OUT"
SOURCE=/var/lib/utilibre-maintenance/security-20261110/kerberos/kitchenowl/psycopg2_binary-2.9.12.tar.gz
test "$(sha256sum "$SOURCE" | cut -d' ' -f1)" = 5ac9444edc768c02a6b6a591f070b8aae28ff3a99be57560ac996001580f294c
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
install -d -m 0700 -o 65534 -g 65534 "$OUT"
cleanup() {
 if test -f "$OUT/container.cid"; then
  CID=$(cat "$OUT/container.cid")
  if printf '%s' "$CID" | grep -Eq '^[a-f0-9]{64}$'; then docker rm -f "$CID" >/dev/null 2>&1 || :; fi
 fi
}
trap cleanup EXIT HUP INT TERM
timeout 300 docker run --rm --cidfile "$OUT/container.cid" --pull=never \
 --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
 --user 65534:65534 --cpus 1 --memory 768m --memory-swap 768m --pids-limit 64 \
 --log-driver none --ulimit core=0 --tmpfs /work:rw,exec,nosuid,nodev,size=256m,mode=1777 \
 --tmpfs /tmp:rw,nosuid,nodev,size=32m,mode=1777 \
 --mount type=bind,src="$SOURCE",dst=/source.tar.gz,readonly \
 --mount type=bind,src="$OUT",dst=/output \
 --entrypoint sh sha256:404b83c337c634b8ad5b54236be2c9a15e7d28f27534f506400fa755acb91431 -ec '
 cd /work
 tar -xzf /source.tar.gz
 cd psycopg2-binary-2.9.12
 PYTHONPATH=/usr/lib/python3/dist-packages /opt/venv/bin/python setup.py build_ext --inplace > /output/build.log 2>&1
 cp lib/_psycopg.cpython-314-x86_64-linux-gnu.so /output/
 dpkg-query -W -f="\${binary:Package}=\${Version}\n" > /output/packages.txt
 ' > "$OUT/runner.log" 2>&1
sha256sum "$OUT/_psycopg.cpython-314-x86_64-linux-gnu.so" > "$OUT/SHA256SUMS"
printf '%s\n' 'Candidate extension built offline. Compare its identity, then rerun driver scope, native database and application checks before any approval.'
