#!/bin/sh
/bin/busybox mount -t devtmpfs devtmpfs /dev
exec >/dev/console 2>&1
echo UTILIBRE_VENDOR_KERNEL_BOOT_OK
/bin/busybox poweroff -f
