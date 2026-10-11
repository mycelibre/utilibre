# PrivateBin 2.0.6 sanitizer security backport

Deployed 11 October 2026 as `utilibre-privatebin:2.0.6-security-20261011`,
image `sha256:f7095267c9e56e7512e5a79b5b712e29a3ea3d19761b6b640dec72aecc34ded2`.
No encryption, storage, retention, upload limit or access change.

[GHSA-w873-3ghv-hmh6](https://github.com/PrivateBin/PrivateBin/security/advisories/GHSA-w873-3ghv-hmh6)
affects the otherwise current 2.0.6 release. The advisory names 2.1.0, but its
official Docker image was not published when checked. The small hash-gated PHP
build step carries the intent of upstream commits
[2b5d85e](https://github.com/PrivateBin/PrivateBin/commit/2b5d85eed9295acad5608d46c687801d1401eec6)
and [d0e3b0c](https://github.com/PrivateBin/PrivateBin/commit/d0e3b0c72848ee45e839f5400d679b5b06b517c7).

The native browser test found that `USE_PROFILES: {html: true}` overrides an
`ALLOWED_ATTR` list in this bundled DOMPurify. Therefore the patch also explicitly
forbids `class`, `style` and `id` on untrusted HTML. Trusted translation strings
retain their separate restricted configuration. No sanitizer was replaced.

A new script filename prevents an old CDN/browser copy being selected. The
native translation-loader selector and PHP SRI table change with that filename;
the English-only check did not catch this dependency, the Spanish check did.
Do not deploy the template independently from its matching image.

```sh
docker build --network none -t utilibre-privatebin:2.0.6-security-20261011 deployment/utilibre/privatebin-security
node deployment/utilibre/tests/check-privatebin-uploads.mjs
```

Isolated test passed: deceptive attributes removed; 25 MB encrypted file round
trip with SHA-256 equality; oversized attachment refused before upload; server
ciphertext cap; maximum one-week expiry; expired fixture purged; missing storage
marker fails closed; English and Spanish/390px Chromium. Public HTTPS repeated
the sanitizer, full 25 MB round trip, oversize rejection and one-week checks at
19:03 UTC; the fictional paste was deleted. Receipts are private under
`/opt/utilibre/reports/privatebin-uploads-Ooq2Pg/` and `privatebin-uploads-tJayMF/`.
Not a physical-phone or Opera test. Existing tabs must reload for the new code.

Configuration-only rollback snapshot:
`/var/lib/utilibre-maintenance/privatebin-20261011/`. Restore only the former
image line and matching template, then recreate PrivateBin; do not overwrite
other Compose changes or touch the backup-excluded temporary data disk. Rolling
back also restores the Markdown advisory, so prefer a tested forward fix.

Remove this backport after a supported upstream release passes the same checks.
The source recipe is part of Utilibre's public integration source archive.
