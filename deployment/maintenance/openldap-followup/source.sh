#!/bin/sh
# Package clean corresponding source, never the compiler's binary staging tree.
set -eu
cd /work/openldap-followup
test ! -d source-export
dpkg-source -x source/openldap_2.5.13+dfsg-5.dsc source-export
cp tree/debian/changelog source-export/debian/changelog
for commit in 752d320cf96e46f24c0900f1a8f6af0a3fc3c4ce 6563fab9e2feccb0a684d0398e78571d09fb808b; do
  cp "source/$commit.patch" "source-export/debian/patches/utilibre-$commit.patch"
  printf '%s\n' "utilibre-$commit.patch" >> source-export/debian/patches/series
done
cd source-export
QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS='--fuzz=0' quilt push -a
cmp libraries/libldap/fetch.c ../tree/libraries/libldap/fetch.c
cmp libraries/libldap/url.c ../tree/libraries/libldap/url.c
dpkg-source -b .
printf 'OPENLDAP_SOURCE_PASSED\n'
