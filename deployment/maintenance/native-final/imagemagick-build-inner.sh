#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive
# Build against genuine signed Debian headers, not hidden vendored search paths.
unset LD_LIBRARY_PATH
apt-get -qq update
apt-get -qqy --no-install-recommends install \
  autoconf binutils build-essential ca-certificates curl \
  libfftw3-dev libheif-dev libjpeg-dev liblcms2-dev libltdl-dev liblzma-dev \
  libxml2-dev libpng-dev librsvg2-dev libtiff-dev libtool libwebp-dev \
  libzip-dev libzstd-dev pkg-config
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
cd /work
tar -xf /source.tar.gz --strip-components=1
./configure --prefix=/opt/imagick --without-openexr > /output/configure.log 2>&1
make -j1 > /output/make.log 2>&1
make DESTDIR=/work/stage install >> /output/make.log 2>&1
# Follow upstream's runtime trim. Keep current deployment's security policy.
find /work/stage/opt/imagick/lib -maxdepth 1 -name 'libMagick++*' -delete
rm -r /work/stage/opt/imagick/include /work/stage/opt/imagick/share
tar -C /work/stage -czf /output/imagemagick-no-exr.tar.gz opt/imagick
sha256sum /output/imagemagick-no-exr.tar.gz > /output/SHA256SUMS
