# Final small vendor layers — 11 October 2026

Deployed and checked by the release owner after isolated tests. Addy's database
and LiberaForms' application pins now select these exact images. No account,
registration, retention, mail or application-feature setting was changed.

Addy's current native backup at
`/opt/utilibre/addy/backups/2026-10-11T21-16-01Z` passed a separate isolated
restore. Forms' encrypted pack backup at `2026-10-11T21-02-10-890Z` authenticated
and restored its native login/authorized encrypted-answer fixture in a separate
database; production tables were not overwritten. Both public login endpoints
return 200 after the release; MariaDB is healthy on the exact candidate ID.
The initial Forms release harness incorrectly required a Docker healthcheck
that this WSGI app does not define and reverted the image. The reviewed layer
was reapplied using its real native HTTP login/CSRF gate, which passed. The
complete receipt is `vendor-stage-20261011/final-live.json` in private state.

| Candidate | Exact image ID | Native package change |
| --- | --- | --- |
| `utilibre-mariadb:12.2.2-openssl-security-20261011` | `sha256:75f0d969e0d714e8fcdd711297bb9df9b4b4c5b7d2f9f9aad58883918f335167` | Ubuntu `libssl3t64` and `openssl` 3.0.13-0ubuntu3.9 → 3.0.13-0ubuntu3.16 |
| `utilibre-liberaforms:4.11.1-pcre-security-20261011` | `sha256:5b403053cb749f6b843fb9d3bda92072165b8d83a95717b1c3452ef909c949fd` | Debian `libpcre2-8-0` 10.46-1~deb13u2 → 10.46-1~deb13u3 |

The [Ubuntu OpenSSL advisory](https://ubuntu.com/security/CVE-2026-84782) and
[Debian PCRE2 tracker](https://security-tracker.debian.org/tracker/CVE-2026-103111)
were rechecked on 11 October. These are signed vendor backports, not engine or
framework upgrades. Package selection is exact in
`Dockerfile.mariadb-openssl-security` and `Dockerfile.liberaforms-pcre-security`.

## Verification

MariaDB remains **12.2.2-MariaDB-ubu2404**, on its exact official base digest
`6a4c4bbf0447c2247801309513fcc0dd17c3f35390368139ce419387fdd1144d`.
Its native user, entrypoint, command, environment, ports, volumes and workdir
are unchanged. SHA-256 across installed MariaDB engine/client package files and
`/usr/local/bin` is unchanged:
`b32fd0d48a80a6f35c57d0d89394db1aefe27d7ca9ae87978e0e8498d4a11e6f`.

`node deployment/maintenance/check-mariadb-openssl-security.mjs` passed at
21:15 UTC: two disposable network-none instances, generated private test
credentials, authenticated native UTF-8/JSON/decimal reads and writes,
transaction rollback, restricted-account denial, TLS_AES_256_GCM_SHA384 session,
and native logical dump restored into the second instance. No production
database was mounted or copied. This is not a full Addy mail/alias workflow or
a production-data restore. The generated fixture containers and data were
removed. Receipt: `/var/lib/utilibre-maintenance/vendor-final-20261011/mariadb.json`.

LiberaForms builds on the tested CairoSVG image
`394ce6c0e08ded4f72d577c0a9313b4fb2ff17aa9894504cd400e4928c7147e1`.
It retains CairoSVG 2.9.1 and every Python/application/privacy patch. Native
container configuration is unchanged; `/app` and `/usr/local` file-content
SHA-256 remains
`a2cb70baadebfdadbb11c905cf445cf1d0468afdff7f19e468b0969f3399b8ec`.
`pip check` passes.

`node deployment/maintenance/check-liberaforms-cairosvg.mjs utilibre-liberaforms:4.11.1-pcre-security-20261011`
passed at 21:15 UTC. The existing fixture checks native avatar generation,
SVG→PNG dimensions/pixel content, SVG→PDF, two native account logins, creation
of a form requiring encrypted answers, owner answer-page access and denial to
a second/anonymous account. The gate uses a blank temporary database with only
shared loopback, no production secrets or configuration. Browser encryption,
key recovery, answer submission/export and SMTP are not re-tested by this gate.
Both temporary containers were removed. Receipt:
`/var/lib/utilibre-maintenance/vendor-stage-20261011/liberaforms-pcre.json`.

The existing runner's only integration change is an optional two-value image
allowlist and a separate receipt filename; its fixture semantics are unchanged.
Syntax checks and scoped `git diff --check` passed.

Candidate scans completed at 21:16 UTC. MariaDB: **1 critical / 24 high** raw
occurrences remain, with no finding against the upgraded `libssl3t64`/`openssl`.
Forms: **0 critical / 56 high** remain, with no PCRE2 finding (the CairoSVG-only
candidate had 57 high). These counts are not exploitability conclusions. JSON
receipts are `mariadb-scan.json` and `forms-scan.json` under the private
`vendor-final-20261011` directory. Existing unrelated findings are not hidden.

## Resource and release scope

Layers add 2,923,559 bytes (MariaDB) and 381,358 bytes (Forms). Builds used one
CPU and a 768 MiB limit; MariaDB fixtures used 512 MiB each with bounded tmpfs,
Forms reused its existing 384 MiB limit. Disk remained above the 8 GiB recovery
floor (approximately 9.4 GiB free after the gates).

Before repeating production MariaDB replacement, take/verify a current native backup using
the established saved-account-data procedure. Change only Addy's DB image pin;
retain engine settings and persistent data. Change only Forms' application pin
and preserve the required-encryption/no-upload policy. Validate database health,
Addy application health and native Forms sign-in/creation after replacement.
There is no schema or application migration in these two layers. Rollback is
the previous exact image with unchanged configuration/data; do not restore a
database over intervening work merely to reverse a library layer.

Neither candidate fixes unrelated scanner findings, static gosu/Go code,
framework dependencies or untested application flows. Security findings remain
subject to the shared private queue and final running-image review.
