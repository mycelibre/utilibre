#!/bin/sh
# Ordinary compatibility checks only. Run through vendor-preflight.py in its
# networkless, unprivileged container; never install these packages on the host.
set -eu
mkdir -p /work/runtime
cp -a /candidate/extracted/grub2-common /candidate/extracted/libefiboot1t64 /candidate/extracted/libefivar1t64 /candidate/extracted/runtime-libraries /work/runtime/
export LD_LIBRARY_PATH=/work/runtime/runtime-libraries:/work/runtime/libefiboot1t64/usr/lib/x86_64-linux-gnu:/work/runtime/libefivar1t64/usr/lib/x86_64-linux-gnu
bin=/work/runtime/grub2-common/usr/bin
"$bin/grub-script-check" --version
"$bin/grub-script-check" /candidate/boot-config.cfg
printf '%s\n' 'set timeout=5' 'menuentry "Synthetic maintenance test" {' '  echo "Configuration parsed"' '}' > /tmp/valid.cfg
"$bin/grub-script-check" /tmp/valid.cfg
printf '%s\n' 'menuentry "Incomplete" {' > /tmp/invalid.cfg
if "$bin/grub-script-check" /tmp/invalid.cfg >/tmp/error.log 2>&1; then
    echo unexpected-invalid-acceptance
    exit 1
fi
"$bin/grub-file" --is-x86_64-efi /candidate/extracted/grub-efi-amd64-signed/usr/lib/grub/x86_64-efi-signed/grubx64.efi.signed
"$bin/grub-file" --is-x86_64-efi /candidate/extracted/grub-efi-amd64-unsigned/usr/lib/grub/x86_64-efi/monolithic/grubx64.efi
printf '%s\n' 'PASS: version, current-config, valid-config, invalid-config rejection, signed-efi recognition, unsigned-efi recognition'
