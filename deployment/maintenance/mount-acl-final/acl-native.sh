#!/bin/sh
set -eu
cd /work/mount-acl-final
mkdir -p acl-candidate
for pkg in libacl1 acl libacl1-dev; do
 dpkg-deb -x "${pkg}_2.4.0-1~deb12u1+utilibre1_amd64.deb" acl-candidate
done
cc -Wall -Wextra -Werror -O2 -Iacl-candidate/usr/include recipes/acl-regression.c \
 -Lacl-candidate/usr/lib/x86_64-linux-gnu -lacl -o acl-output/acl-regression
runuser -u nobody -- env LD_LIBRARY_PATH=/work/mount-acl-final/acl-candidate/usr/lib/x86_64-linux-gnu \
 /work/mount-acl-final/acl-output/acl-regression
runuser -u nobody -- env LD_LIBRARY_PATH=/work/mount-acl-final/acl-candidate/usr/lib/x86_64-linux-gnu \
 PATH=/work/mount-acl-final/acl-candidate/usr/bin:/usr/bin:/bin sh -ec '
 TASK_TMP=$(mktemp -d /tmp/acl-tar-XXXXXX)
 cd "$TASK_TMP"
 mkdir source restored
 printf "Fictional native ACL fixture\n" > source/example.txt
 setfacl -m u:1:r source/example.txt
 getfacl -cp source/example.txt > expected
 tar --acls -cf example.tar -C source example.txt
 tar --acls -xf example.tar -C restored
 cmp source/example.txt restored/example.txt
 getfacl -cp restored/example.txt > actual
 cmp expected actual
 mkdir target
 printf "Control\n" > target/file
 ln -s target unsafe
 printf "# file: unsafe/file\nuser::rw-\nuser:1:r--\ngroup::---\nmask::r--\nother::---\n" > unsafe.acl
 if setfacl -P --restore=unsafe.acl 2> error; then exit 10; fi
 test -s error
 test "$(getfacl -cp target/file | grep -c "^user:1:" || true)" = 0
 printf "GNU tar native ACL archive/export/reopen and physical restore rejection passed.\n"
 '
