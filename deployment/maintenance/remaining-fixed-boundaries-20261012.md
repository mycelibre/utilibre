# Fixed-version findings: bounded classification, 12 October 2026

## Current disposition, 01:55 UTC

**All 48 fixed-version critical/high records remaining at the preceding checkpoint
are addressed.** Ten image groups / 13 roles and the coupled host SSH packages
are deployed; Wallabag's existing backport is reverified. The **01:49:19** complete
rescan and exact expiring reviews show **zero pending critical/high records with
a scanner-reported fixed version**. There are still **3 critical / 1,627 high**
pending records without reported fixes. Those are not waived or proven exploits.

[Exact changes, source provenance, native tests and recovery](closure-review/README.md).
The table below is historical: major library compatibility was tested, the
Grist/MCP adapters are committed, SimpleLogin's real framework backports passed,
and Authentik retains its original FIPS module. This does not authorize opening
SimpleLogin, claim complete compiled-code coverage, or patch the running kernel.
The independent GitHub scheduling gap remains separate and unclosed.

## Original classification checkpoint

This is the **00:22:04 UTC scan checkpoint**, not a declaration that every
finding below is still present after subsequent releases. The private queue
had 1,691 unclosed critical/high records: 1,632 without a reported fixed
version and **59 with one**. All 59 were high severity: 50 runtime-image
records and nine tracked-source records. Counts are package/advisory/artifact
records, not distinct vulnerabilities, applications or demonstrated exploits.

No finding is waived by this table. A disabled feature, unused developer
dependency, or old metadata is not by itself evidence that a package was fixed.
The raw findings remain available. Later exact-image scans and expiring
payload-based reviews supersede this checkpoint individually.

| Boundary | Records | Actual next step / evidence required |
| --- | ---: | --- |
| Wishlist, Spliit and Rallly: deepmerge-ts 7.1.5 → 8.0.0 | 3 | Major API migration and native regression; rebuild relevant compiled SSR copies. Changing node_modules alone does not establish that embedded copies changed. |
| Wishlist and Kuma: Nodemailer | 6 | Wishlist has two records on 9.1.1; Kuma four on 7.0.13. Fix ranges reach 10.0.6. Validate supported mail-transport APIs and synthetic delivery; do not send unsolicited real mail. |
| Authentik: OpenSSL FIPS packages | 4 | Installed vendor version is deliberately held at `3.5.7+ak-fips`. Generic Debian replacement failed the compatibility gate. Obtain a compatible vendor/FIPS-provider build and repeat MFA/OAuth checks; do not silently replace the provider. |
| Penpot admin: OpenSSL inventory mismatch | 2 | Exact live admin image `b1995581…` already has signed `3.5.7-1~deb13u3+dhi0` payload, with 14 library/provider files checked in its native receipt. Add admin-specific current-image payload proof before classifying scanner u2 metadata; no blanket DHI exemption. |
| Grist / RSSHub: basic-ftp; Grist image-size and ip-address | 4 | Grist has three records, RSSHub one. Fixed major releases are basic-ftp 6.2.1, image-size 2.0.3 and ip-address 10.3.1. Check importer/proxy/plugin callers and SSRF boundaries before a supported upgrade. |
| Grist: setuptools-vendored jaraco.context and wheel | 2 | Top-level wheel is already 0.46.3. Real old copies remain under `setuptools/_vendor/`: jaraco.context 5.3.0 and wheel 0.45.1. A compatible setuptools/vendor update or proven build-only removal must address these copies, not just top-level distributions. |
| Wallabag: spomky-labs/otphp 10.0.3 → 11.4.3 | 1 | Composer-major compatibility; repeat native TOTP/replay/account-isolation and export checks. Native MFA is in actual use, so disabling it is not a substitute. |
| Resume and Bookplate: Next 16.3.6 → 16.3.8 | 3 | Two runtime records plus Bookplate's tracked lock. This is a same-branch patch candidate, not an established major blocker. Rebuild real application bundles and repeat auth/import/export gates; update the source lock too. |
| FerretDB: MCP SDK v0.2.0 → v1.x | 8 | Four runtime plus four tracked go.mod records. Previous upgrade failed to compile because the API changed. MCP listener/exporter are disabled, but the dependency remains linked. Use a maintained compatible upstream integration and rerun Gathio MongoDB API/restore checks. |
| Projects: Redis Heroku demonstration | 1 | Direct redis 3.1.1 is fixed and is resolved by both installed Sails Redis adapters; deployed REDIS_URL is unset. A separate 3.1.0 copy remains inside the vendor's Heroku demonstration. Remove only that unused example with exact whole-image parity and isolated native app gates; do not rewrite its version metadata. See `projects-redis-final/`. |
| DeGoog / Penpot admin / Candlr: small JS updates | 5 | source-map-js 1.2.1 → 1.2.2 in three apps; admin js-yaml 4.3.1 → 4.3.2; Candlr sharp 0.35.4 → 0.35.5. These are patch candidates. Locate all deployed/compiled copies and validate parser, error and image-output paths. |
| SimpleLogin: framework and bundled/build-tool copies | 16 | Three actual Flask/Werkzeug framework records need a coherent supported dependency migration, not a blind major overlay. The other 13 concern msgpack, pycryptodome, setuptools, urllib3, virtualenv and uv's two Rust libraries. Some are real venv tooling; one old pycryptodome copy is demonstrably a uv sdist cache. Locate and fix/remove each exact copy only after runtime-use proof. Actual normal imports already use pycryptodome 3.24.0 and urllib3 2.8.0. Do not treat all 13 as false positives. |
| Anubis developer dependency graph | 4 | go-billy, go-git and moby/go-archive appear in the tracked go.mod but not the final binary's embedded build inventory. Update/test the developer graph and publish matching locks; this does not require inventing a runtime-package finding or exempting the source scan. |

The lowest-risk sequence is the small same-branch package fixes, exact stale
payload proofs, and proven redundant example/cache removal. Major framework,
MFA, FIPS and protocol migrations need their own compatibility gates. Disk
headroom is a separate operational constraint, not a justification for ignoring
findings or dropping rollback images.

### Follow-up released at 00:39:58 UTC

Bookplate's complete Next 16.3.8 build and source lock, all three small JS
overlays, Candlr's matching Sharp/native assets and Projects' exact unused
Heroku example removal are deployed. Their native/image/access gates passed.
Resume's six individual Next findings have exact Hono-startup/optional-peer
reviews; it is not a Next server. Admin OpenSSL's live fixed payload has its
own exact-image seven-day reviews. None of the broader rows is waived by this.

The **00:42:20** rescan and reviewed queue leave **48 fixed-version high
records**, down from this table's 59-record checkpoint. The 1,632 pending
critical/high records without a reported fix remain separate. See
[release evidence](../../docs/updates.md#maintenance-release--12-october-2026)
for actual images, limitations and rollback references.

## Scheduled external availability check

One check at **00:29:45 UTC on 12 October** still found only real scheduled run
`38174272872`, created 11 October 20:56:11 and completed successfully 20:56:24.
The cron offset refresh (`0496567`, 11/26/41/56 UTC) had not produced a visible
new scheduled run at that observation. Manual runs do not clear this warning.
No root cause was exposed by the API; do not describe it as a failed service
test. [GitHub documents possible delayed or dropped scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
