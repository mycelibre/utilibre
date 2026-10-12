#!/bin/sh
set -eu
TASK_ROOT=/var/lib/utilibre-maintenance/penpot-native-followup-20261012
mkdir -p "$TASK_ROOT/tiff/sources" "$TASK_ROOT/tiff/output"
fetch() {
  name=$1 checksum=$2
  if ! test -s "$TASK_ROOT/tiff/sources/$name"; then curl -fLsS --max-time 90 "https://deb.debian.org/debian/pool/main/t/tiff/$name" -o "$TASK_ROOT/tiff/sources/$name"; fi
  printf '%s  %s\n' "$checksum" "$TASK_ROOT/tiff/sources/$name" | sha256sum -c -
}
fetch tiff_4.7.2-1.dsc 26ce045ca8ffdb562ff2978834f79f067a552e95276deba1dc686aaffd580ad3
fetch tiff_4.7.2.orig.tar.bz2 c5086d8f7c5ba51ca98241f24a8bd1cb66218c399077aeccbf6a236cf3152acc
fetch tiff_4.7.2-1.debian.tar.xz 7b71ad0b032022ec533171cad96c7823845d3c09254f1c073f03853801ca1c80
