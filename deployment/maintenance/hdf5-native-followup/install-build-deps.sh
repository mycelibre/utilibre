#!/bin/sh
# Run only inside the named disposable Bookworm compiler, never on the host or
# in an application container. Native serial recipe; uninstalled MPI disabled.
set -eu
test -d /work/hdf5-native-followup/recipe
. /etc/os-release
test "$VERSION_CODENAME" = bookworm
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  build-essential debhelper devscripts quilt dpkg-dev debian-keyring \
  gfortran default-jdk-headless javahelper junit4 libslf4j-java sharutils \
  chrpath libcurl4-openssl-dev libaec-dev libjpeg-dev zlib1g-dev libssl-dev \
  libhdf5-dev libnetcdf-dev libgdal-dev
