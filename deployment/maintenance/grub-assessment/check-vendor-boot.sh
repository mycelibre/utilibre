#!/bin/sh
# Only unmodified vendor code and a synthetic RAM root are booted. No host
# disk/device, firmware variables, network, or vulnerability fixture is used.
set -eu
cp -a /inputs/tools /work/tools
cp /work/tools/usr/share/OVMF/OVMF_VARS_4M.fd /work/test-vars.fd
export LD_LIBRARY_PATH=/work/tools/usr/lib/x86_64-linux-gnu
export QEMU_MODULE_DIR=/work/tools/usr/lib/x86_64-linux-gnu/qemu
/work/tools/usr/bin/qemu-system-x86_64 --version
exec /work/tools/usr/bin/qemu-system-x86_64 \
  -L /work/tools/usr/share/qemu \
  -machine pc,accel=tcg,dump-guest-core=off -m 256 -smp 1 \
  -nodefaults -display none -serial stdio -monitor none -nic none -no-reboot \
  -drive if=pflash,unit=0,format=raw,file=/work/tools/usr/share/OVMF/OVMF_CODE_4M.fd,readonly=on \
  -drive if=pflash,unit=1,format=raw,file=/work/test-vars.fd \
  -device virtio-scsi-pci,id=scsi0 \
  -drive if=none,id=bootdisk,format=raw,file=fat:ro:/inputs/fat,readonly=on \
  -device scsi-hd,drive=bootdisk,bootindex=1
