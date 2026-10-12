#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends build-essential dpkg-dev autoconf automake libtool pkgconf flex bison quilt \
 xutils-dev xfonts-utils x11proto-dev xtrans-dev libxau-dev libxdmcp-dev libxfont-dev libpixman-1-dev \
 libxkbfile-dev nettle-dev libudev-dev libselinux1-dev libaudit-dev libdrm-dev libglvnd-dev mesa-common-dev \
 libunwind-dev libxshmfence-dev libepoxy-dev libegl1-mesa-dev libgbm-dev libdbus-1-dev libsystemd-dev \
 libbsd-dev xauth x11-utils x11-xkb-utils xkb-data qpdf
apt-get clean
