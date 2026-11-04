#!/bin/sh
set -eu
test -f /.dockerenv
test "$(stat -f -c %T /work)" = tmpfs
for state in baseline candidate; do
 mkdir "/work/$state"
 cp -a "/$state/." "/work/$state/"
 cd "/work/$state"
 autoreconf -fi > "/output/$state-autoreconf.log" 2>&1
 ./configure --with-kerberos5 --with-pam > "/output/$state-configure.log" 2>&1
 fixed=0; test "$state" != candidate || fixed=1
 cc -I. -Iopenbsd-compat -DFIXED="$fixed" -O1 -g -ffunction-sections -fdata-sections \
  -Wl,--gc-sections /recipe/gssapi-native.c -lgssapi_krb5 -lkrb5 -lk5crypto -lcom_err \
  -o /work/gss-state
 /work/gss-state > "/output/$state.json"
done
