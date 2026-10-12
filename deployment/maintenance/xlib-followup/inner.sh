#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive
if test "$1" = prepare; then
 apt-get -o APT::Update::Error-Mode=any update
 apt-get install -y --no-install-recommends build-essential dpkg-dev debhelper \
  pkg-config xtrans-dev x11proto-dev libxcb1-dev quilt xutils-dev xmlto \
  xorg-sgml-doctools w3m libx11-dev libxext-dev libxi-dev
 dpkg-query -W > /output/build-packages.txt
 exit
fi
test "$1" = build
export DEB_BUILD_OPTIONS=parallel=2 SOURCE_DATE_EPOCH=1791817200
for variant in $2; do
 for package in libx11 libxrender libxtst; do
  if test -n "${3:-}" && test "$package" != "$3"; then continue; fi
  directory="/work/$variant/$package"
  test -d "$directory" || continue
  cd "$directory"
  debian/rules clean > "/output/$variant-$package-clean.log" 2>&1
  export QUILT_PATCHES=debian/patches
  if test "$variant/$package" = dhi/libxtst; then
   # The signed vendor tarball removed one obsolete XML comment while retaining
   # Debian's manpage-date patch context. Native quilt defaults allow this.
   # Permit one context line only for that exact documentation patch; never
   # relax fuzz for a security patch or change executable source to make it fit.
   test "$(sha256sum debian/patches/01_fix_date_in_manpages.diff | cut -d ' ' -f 1)" = 23a0f0d34d8514db5da084b1b1a6631b474b1edd94b8bceffe2f5deff35991e2
   quilt push --fuzz=1 > "/output/$variant-$package-documentation-context.log" 2>&1
  fi
  quilt push -a --fuzz=0 > "/output/$variant-$package-patches.log" 2>&1
  dpkg-buildpackage -b -us -uc -nc > "/output/$variant-$package-build.log" 2>&1
  for patch in debian/patches/utilibre-*.patch; do
   patch -p1 --fuzz=0 --batch --reverse --dry-run -i "$patch"
  done
 done
 mkdir -p "/output/$variant"
 find "/work/$variant" -maxdepth 1 -type f \( -name '*+utilibre1*.deb' -o -name '*+utilibre1*.changes' -o -name '*+utilibre1*.buildinfo' \) -exec cp -- '{}' "/output/$variant/" \;
done
