# Penpot native rendering maintenance — 12 October 2026

**Deployed and verified.** Penpot remains 2.18.3. Only the backend/exporter
images changed; the frontend, account rules, documents and application
configuration are preserved. Exact image/backup/rollback receipts remain private
in `/var/lib/utilibre-maintenance/penpot-native-followup-20261012/`.

## Native repairs

- librsvg **2.60.3+utilibre1**, upstream 2.60 maintenance release. The native
  Debian legacy `rsvg_handle_new_gz` compatibility patch is retained; an initial
  candidate missing that ABI was rejected. All old symbols and native dependency
  interfaces remain. Five upstream test groups, duplicate-entity allocation
  regression, old-header parsing/rendering and unchanged raster pixels passed.
- libtiff **4.7.2-1~deb13u1+utilibre1**, authenticated Debian upstream source,
  rebuilt against existing stable libraries. **109 upstream tests passed**,
  all old exports and linked dependencies are retained. Eight existing codecs
  round-trip through the old headers. Both the system library and ImageMagick's
  private copy are updated and byte-equal. The previous DHI tool-only patches
  were inspected separately; those CLI tools are not installed. This is not a
  blanket waiver of every advisory attributed to TIFF.

FontForge SVG/TTF/OTF and WOFF/WOFF2 conversions, ImageMagick PNG/JPEG/WebP/TIFF/SVG
pixels and codec inventory passed. The HEIF plugin already emitted a missing
symbol warning on the original image and still does; HEIF processing is **not**
claimed verified by this release.

The full disposable Penpot journey used two fictional accounts: editable native
export/import/reload, account denial, member removal/leave, legacy orphan access
denial, PNG export, backend media thumbnails and deletion. No external requests
were observed in that browser flow. Production login and the Authentik handoff
passed after deployment; no real credentials or user documents were used.

## Reproduction and release

Pinned downloads and hashes are in `acquire.sh` / `tiff-acquire.sh`.
`build.sh` / `tiff-build.sh` create bounded disposable native builders. Rust
1.89 and cargo-c 0.10.16 are build tools only, not production services.
`package.mjs`, `stage.mjs`, `check.mjs`, `tiff-stage.mjs`, `tiff-check.mjs`
produce and check the exact overlay chain. Preserve the supplied Debian ABI
patch and vendored Cargo lock/dependencies. Never silently substitute latest.

Run the established full application checker with the generated
`native-final/penpot-rsvg-tiff-followup.json` manifest. Then:

```sh
node deployment/maintenance/native-final/release-penpot.mjs prepare --rsvg-tiff
# Review receipt; change only the two exact Compose image pins.
node deployment/maintenance/native-final/release-penpot.mjs apply --rsvg-tiff
node deployment/maintenance/penpot-native-followup/publish-source.mjs
```

Preparation briefly stops the three native writers for a consistent local
snapshot, restarts them and verifies a PostgreSQL restore in an isolated
temporary database. This is an on-host recovery snapshot, **not** an off-host
backup. The image rollout does not restore or migrate user data. The release
requires 8 GiB free and verifies exact image IDs, unchanged Compose settings,
unrelated containers, native readiness, installed library hashes, previous XML
fixes and public login/OIDC. On failure it restores the exact predecessor pair.

For manual rollback use only `oldRef`/`oldImage` from the latest passed receipt,
restore the two image scalars and recreate backend/exporter with `--no-deps
--no-build --pull never`; verify native readiness and login. Check for subsequent
overlays first. Do not restore user databases merely to roll back an image.

Complete corresponding sources, notices, pins and recipes are published as
`security-penpot-native-20261012-source.tar.gz` beside the existing source
offers. Source audits and scan decisions must bind the currently running image;
old review keys cannot simply be copied. This release does not establish that
all Penpot dependencies are vulnerability-free.
