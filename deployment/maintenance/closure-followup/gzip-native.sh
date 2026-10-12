#!/bin/sh
# Fictional files only; disposable, non-root, network-disabled container.
set -eu
TASK_GZIP_TMP=$(mktemp -d /tmp/utilibre-gzip-XXXXXXXX)
trap 'rm -r -- "$TASK_GZIP_TMP"' EXIT HUP INT TERM
cd "$TASK_GZIP_TMP"
gzip --version | head -1
ldd -r /usr/bin/gzip > imports
! grep -E 'not found|undefined symbol' imports
printf 'Fictional document. Español: acción, reunión.\n' > example.txt
gzip -n -9 -c example.txt > example.txt.gz
gzip -t example.txt.gz
gzip -dc example.txt.gz > reopened.txt
cmp example.txt reopened.txt
test -f example.txt
cat example.txt example.txt > expected-concatenated.txt
cat example.txt.gz example.txt.gz | gzip -dc > concatenated.txt
cmp expected-concatenated.txt concatenated.txt
gzip -n -1 < example.txt | gzip -dc > stream.txt
cmp example.txt stream.txt
zgrep -q 'Fictional document' example.txt.gz
printf 'not a compressed file\n' > corrupt.gz
if gzip -t corrupt.gz > invalid-output 2>&1; then exit 1; fi
test -s invalid-output
cp example.txt.gz for-file.txt.gz
gzip -dk for-file.txt.gz
cmp example.txt for-file.txt
test -f for-file.txt.gz
printf '#!/bin/sh\nprintf "fictional executable result\\n"\n' > program
chmod 700 program
gzexe program > gzexe-output 2>&1
./program > executable-output
test "$(cat executable-output)" = 'fictional executable result'
echo NATIVE_GZIP_STREAM_CONCAT_INTEGRITY_PRESERVE_ZGREP_GZEXE_PASSED
