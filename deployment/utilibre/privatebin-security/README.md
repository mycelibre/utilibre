# PrivateBin 2.0.6 sanitizer security backport

**Follow-up, 11 October 21:40 UTC:** the signed same-branch PHP/Alpine layer
`utilibre-privatebin:2.0.6-php-security-20261011-p3` is live. PHP is 8.5.11;
application files, sanitizer, native directory-detection filename, configuration,
25 MB attachment limit and one-week retention remain unchanged. The isolated
gate and public HTTPS encrypted 25 MB SHA-256 round trip passed again (private
receipts `privatebin-uploads-sRt2JQ` and `privatebin-uploads-UN5bBJ`).
The [official directory](https://privatebin.info/directory/) was rechecked and
now displays **File upload ✔** for `https://paste.utilibre.org/`. This is an
observed directory update, not a promise of subsequent uptime or ratings.
Vendor layer recipe: `deployment/maintenance/alpine-final/Dockerfile.privatebin`.

Deployed 11 October 2026 as `utilibre-privatebin:2.0.6-security-20261011-p2`,
image `sha256:82d9ff7456aa51c5865532b00e6ee1d1dc76e32bcb9a249419eb61ad72cd6f14`.
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

The p2 template keeps the native `js/privatebin.js?2.0.6` prefix and adds a release
query parameter to avoid selecting stale CDN/browser bytes. The first backport
renamed the script, which broke the official directory's version detector and
could prevent the stored attachment field from updating. The native filename
also preserves the Spanish translation loader's selector. The patched script
has its matching SRI hash. Do not deploy the template independently from its
matching image. A regression assertion uses the upstream directory's version,
Bootstrap and attachment detection against the first 1023 HTML lines.

```sh
docker build --network none -t utilibre-privatebin:2.0.6-security-20261011-p2 deployment/utilibre/privatebin-security
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

The p2 candidate repeated all checks at 19:54 UTC; public HTTPS passed at 19:58
UTC, including exact directory detection, sanitizer, full 25 MB SHA-256 round
trip, oversize refusal and maximum one-week expiry. EN/ES and 390px emulation
had no observed external HTTP requests or script errors. The fictional paste
was deleted. Evidence: `/opt/utilibre/reports/privatebin-uploads-UtA8TL/` and
`privatebin-uploads-fxVREX/`. The first public attempt caught a transient 502
immediately after recreation; the backend and public root subsequently returned
200 and the complete workflow passed. At that checkpoint the directory still
stored a cross; the later check recorded at the top of this page confirms it
has now changed to the upload checkmark.

Configuration-only rollback snapshot:
`/var/lib/utilibre-maintenance/privatebin-20261011/`. Restore only the former
image line and matching template, then recreate PrivateBin; do not overwrite
other Compose changes or touch the backup-excluded temporary data disk. Rolling
back also restores the Markdown advisory, so prefer a tested forward fix.

For p2 specifically, `/var/lib/utilibre-maintenance/privatebin-directory-20261011/`
retains the preceding security image/template configuration (no paste data).
Reverting only those matching lines preserves the sanitizer but reintroduces
the directory incompatibility. Leave storage and all unrelated Compose edits
alone.

Remove this backport after a supported upstream release passes the same checks.
The source recipe is part of Utilibre's public integration source archive.
