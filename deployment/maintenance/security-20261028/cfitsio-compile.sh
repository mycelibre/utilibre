#!/bin/sh
# Run only in the pinned compiler container, offline and without production mounts.
set -eu
test "$UTILIBRE_SECURITY_DISPOSABLE" = yes
test ! -e /out/libcfitsio.so.10.4.2.0
cp -a /source /tmp/cfitsio
cd /tmp/cfitsio
export CFLAGS='-g -O2 -fstack-protector-strong -Wformat -Werror=format-security -fPIC'
export CPPFLAGS='-Wdate-time -D_FORTIFY_SOURCE=2'
export LDFLAGS='-Wl,-z,relro -Wl,-z,now'
./configure --prefix=/usr --libdir=/usr/lib/x86_64-linux-gnu --enable-reentrant --with-bzip2
make -j2 shared testprog
LD_LIBRARY_PATH=. ./testprog > /out/upstream-testprog.log
test -s testprog.fit
cp libcfitsio.so.10.4.2.0 /out/
cp testprog.fit /out/upstream-testprog.fit
cc $CFLAGS $CPPFLAGS -I. /native.c -L. -lcfitsio -ldl $LDFLAGS -o /out/cfitsio-native
printf 'CFITSIO_BUILD_PASSED\n'
