# Penpot ImageMagick HEIF alignment — 12 October 2026

Prepared in isolated candidates; root owns production release. Penpot stays
2.18.3. No account rule, user document, plugin set or major application changes.

ImageMagick's private `libheif.so.1` was **1.19.8**, while the already-installed
Debian system library and dav1d/de265 plugins were **1.23.4-1~deb13u1**. The
plugins required `heif_image_get_plane2`, absent from the private copy. The
overlay copies the exact authenticated system library into that one private
location, letting the existing plugins work. No package is installed/removed.

All 271 old public `heif_*` C exports remain; SONAME is unchanged. The full
export set is deliberately **not** called identical: 17 old private C++ async
grid template RTTI/vtable symbols differ. None is referenced by the actual
ImageMagick ELF files or installed codec plugins. Two additional Brotli NEEDED
libraries already exist and resolve; no new dependency is introduced.

`acquire.mjs` authenticates the source and binary using archive-signed Debian
InRelease → Sources/Packages SHA256 → files, then proves the binary archive's
library exactly matches the reused installed system bytes. The local older
maintainer keyring lacks this DSC signer's key; archive authentication provides
the independent signed chain, not trust in an unauthenticated key download.

Native tests cover actual HEIC/AVIF decode, dimensions/RGBA, and unchanged
PNG/JPEG/WebP/TIFF/SVG output. Existing PDF boundaries remain: backend PDF coder
is denied by policy; exporter writes PDF but has no Ghostscript decoder. This
alignment neither relaxes the policy nor claims PDF decoding now works.
The normal isolated two-account Penpot journey remains a mandatory release gate.

## Operations

Private receipts: `/var/lib/utilibre-maintenance/penpot-heif-alignment-20261012`.
Run stage, source acquisition, native checks and:

```
node deployment/maintenance/check-penpot-2.18.3.mjs --manifest=/var/lib/utilibre-maintenance/native-final/penpot-heif-alignment.json
```

Retain its final JSON as the private `application-run.log`. Publish the complete
source offer before root uses the existing Penpot snapshot/restore/release
helper through `release-inputs.mjs`. Reuse the frontend after upstream DNS
refresh; preserve all volumes. Rollback uses the exact backend/exporter
predecessors in `stage.json`, never a database restore merely to change images.

Build performs a one-file copy, not compilation; native tests are bounded to
one CPU/512 MiB. No telemetry, external application requests, runtime downloads
or additional service is introduced. A future upstream image must align its
private HEIF copy with its codec plugins and pass the same real image checks.
