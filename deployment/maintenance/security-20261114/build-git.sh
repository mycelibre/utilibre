#!/bin/sh
# Retained upstream 2.54.1 security release; isolated compiler only.
set -eu
umask 022
cd /work
tar -xJf /input/git-2.54.1.tar.xz
cd git-2.54.1
export CFLAGS="$(dpkg-buildflags --get CFLAGS)" CPPFLAGS="$(dpkg-buildflags --get CPPFLAGS)" LDFLAGS="$(dpkg-buildflags --get LDFLAGS)"
make -j2 prefix=/usr gitexecdir=/usr/lib/git-core USE_LIBPCRE2=YesPlease NO_TCLTK=YesPlease NO_INSTALL_HARDLINKS=YesPlease all
(cd t; for test in t0000-basic.sh t0001-init.sh t0002-gitfile.sh t0003-attributes.sh t0008-ignores.sh t0020-crlf.sh t1510-repo-setup.sh t2000-conflict-when-checking-files-out.sh t3001-ls-files-others-exclude.sh t4103-apply-binary.sh t5500-fetch-pack.sh t6403-merge-file.sh t9300-fast-import.sh; do sh "$test"; done; sh aggregate-results.sh test-results)
cp -a t/test-results /output/
make prefix=/usr gitexecdir=/usr/lib/git-core USE_LIBPCRE2=YesPlease NO_TCLTK=YesPlease NO_INSTALL_HARDLINKS=YesPlease DESTDIR=/work/dest install
find /work/dest -type f -perm /111 -exec sh -c 'for p do if head -c4 "$p" | od -An -tx1 | grep -q "7f 45 4c 46"; then strip --strip-unneeded "$p"; fi; done' sh {} +
tar -C /work/dest -cJf /output/git-runtime.tar.xz .
cp GIT-BUILD-OPTIONS /output/
./git version --build-options > /output/version.txt
