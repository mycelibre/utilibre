# Native upstream build flags, plus an explicit supported one-screen limit.
# This disables generation of other X server executables, not Xvfb extensions.
DEB_HOST_ARCH=amd64
DEB_HOST_ARCH_OS=linux
include debian/rules.flags
override vars = $(shell DEB_BUILD_MAINT_OPTIONS="hardening=+all" DEB_CFLAGS_MAINT_APPEND="-Wno-error=array-bounds" DEB_LDFLAGS_MAINT_APPEND="-Wl,-Bsymbolic" DEB_CPPFLAGS_MAINT_APPEND="-DPRE_RELEASE=0 -DMAXSCREENS=1" dpkg-buildflags --export=configure)
.PHONY: configure-single
configure-single:
	mkdir -p /work/build-$(ROLE)
	cd /work/build-$(ROLE) && $(CURDIR)/configure $(confflags) $(confflags_main) --prefix=/usr --disable-xorg --disable-xnest --disable-kdrive --disable-xephyr --disable-suid-wrapper --disable-docs --disable-devel-docs $(vars)
