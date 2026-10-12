# Final bounded native vendor layers — 11 October 2026

This batch changes native packages only, preserving existing application bytes,
accounts, privacy configuration, retention, ports and protocol boundaries.
Recipes pin exact predecessor images and exact signed vendor package versions.
No application/framework upgrade or registry `latest` pull is involved.

## Genuine updates

| Package | Exact vendor update | Scope |
| --- | --- | --- |
| Debian PCRE2 | `10.46-1~deb13u2` → `10.46-1~deb13u3` | Ten images, fourteen roles: five bounded Squid proxies, FreshRSS, TRIP, BeaverHabits, Unfurl, Radicale, Priviblur, 13ft, BreezeWiki and Family Chess. |
| Ubuntu OpenSSL | Mumble `.15`, Redlib `.12` → `3.0.13-0ubuntu3.16` | Existing server/client libraries; Mumble's matching `openssl` CLI also updated. |
| Penpot admin DHI OpenSSL | `3.5.7-1~deb13u2+dhi0` → `3.5.7-1~deb13u3+dhi0` | Complete coupled `libssl3t64` and `openssl-provider-legacy` packages, retaining the distroless runtime. No shell/package manager was added. |

Primary fixed-version evidence: [Debian PCRE2](https://security-tracker.debian.org/tracker/CVE-2026-103111),
[Debian OpenSSL](https://security-tracker.debian.org/tracker/CVE-2026-84782),
[Ubuntu OpenSSL](https://ubuntu.com/security/CVE-2026-84782), and the
[OpenSSL advisory](https://openssl-library.org/news/secadv/20260929.txt).
APT authenticates repository indexes and package digests; retained archive
SHA-256s are checked against those indexes before staging. All sources were
inspected on 11 October 2026.

## Checks and release

Private, non-user-data receipts live in
`/var/lib/utilibre-maintenance/vendor-leaves-final-20261011/`:

- `pcre-stage.json` and `pcre-native.json`: exact package/native PCRE JIT and
  Unicode checks, unchanged application file hashes and native configuration;
  all five real Squid configurations; FreshRSS fictional account/feed/article
  and OPML export; TRIP empty database and private-route denial; BeaverHabits
  native login routes and unauthenticated denial; Unfurl loopback HEAD redirects
  and request bound; Family Chess two-player moves, permission denial, SQLite
  reopen and fixture expiry. Radicale, Priviblur and BreezeWiki checks cover
  native entry/components, not an invented successful upstream media fetch.
- `ssl-stage.json` and `ssl-native.json`: unchanged application binaries and
  native configuration; Mumble synthetic TLS, password rejection, guest join
  and server-only Opus loopback. Redlib's unchanged startup needs its native
  Reddit OAuth request; only its settings page was requested afterward, not a
  visitor search/content query.
- `admin-stage.json` and `admin-native.json`: all packaged file checksums,
  unchanged `/nitrate` application bytes, native crypto, empty PostgreSQL
  migrations and old/new native HTTP-route parity. Node's embedded OpenSSL is
  distinct from these OS packages and is not represented as repaired here.
- `release.json`: exact image IDs, pre/post configuration hashes, native health,
  listeners, namespace firewall gates and rollback status per project.
- `live.json`: final Chromium public Penpot login/OIDC origin check, Mumble
  private-network TLS/voice loopback and Redlib native settings health.

Builds are serial, package-only, bounded to one CPU and 256–384 MiB. Synthetic
application fixtures use at most 512 MiB per container; admin's two containers
use 384 MiB each. An 8 GiB recovery floor is enforced. Fixtures are removed;
no user data is copied, modified or deleted. These are bounded compatibility
checks, not an uptime claim, exhaustive exploit audit or real-device test.

The release uses existing supervisors for the three application/egress pairs,
preserving their namespace firewall rules. Wallabag's existing supervisor is
stopped/restarted around its proxy replacement. Mumble is deferred if an
aggregate established-control-connection check finds a user; the observation is
instantaneous and a new join can race a restart. It does not store peer details.

Rollback restores only exact previous image scalars (including Redlib's private
`.env` image override), then invokes the same normal supervisor/Compose path
and verifies old images and boundaries. No data restore is attempted. Existing
recovery backups are retained; no new backup of temporary sharing content was
created. `prepare` is read-only; source pins are explicitly reviewed and patched
before `apply`. Do not rerun staging against a changed predecessor blindly.

## Stale DHI inventory is a separate review, not another rollout

Penpot frontend/exporter already have the fixed PCRE2, SQLite, OpenSSL and
util-linux package payloads, but contain older residual `status.d` fragments.
`review-dhi.mjs` leaves both runtime metadata and raw scanner evidence unchanged.
Its eleven retained packages came through authenticated DHI indexes. Each
archive now has a fixed SHA-256 pin and must match the exact package/version
APT record. On every run it re-extracts controls and payload in temporary RAM
storage; it does not trust a previously extracted checksum directory. It checks
every packaged regular file's SHA-256 and every symlink target in the **running
container**, including writable layers and mounted overlays. This matters
because these upstream frontend/exporter runtimes are not read-only. Fresh
scan/queue consistency and a checked exact image are required. For each
explicitly allowed CVE it also checks Debian's primary
source-package record and fixed Trixie version, not merely the scanner label.

The private `dhi-fixed-review.json` initially prepared **170 exact findings,
zero skipped**, each bound to one image/package/role/CVE and expiring after
seven days. It is **not applied** by this script. Refresh it after the final
fleet scan, inspect every skipped proof and let the operator apply only proven
decisions. Raw stale inventory remains visible. No unknown/new CVE inherits a
review. The helper's scope is not all Debian packages or every Penpot finding.
The hardened final rerun on 12 October prepared **170 findings with zero
skipped**, bound to scan `2026-10-12T00:22:04.063Z`. It checked 815 live regular
files and 300 symlink targets across 16 package/container groups. The report
remains `applied:false`; the global scan still has separate coverage gaps, so
this result establishes only these individually checked image/package proofs.

Four focused policy tests cover canonical config hashing, supervisor rollback,
Redlib variable/default preservation and exact review scoping. The combined
native-backport/policy suite passed nine tests. FreshRSS's existing XML review
now requires both its original XML release and the new exact PCRE2 overlay
chain, plus the unchanged live native XML library hash.
Nine additional DHI tests cover authenticated package/version/hash matching,
changed live bytes, redirected symlinks, incomplete/empty proofs and stale or
mismatched scans. The DHI/policy suite passed **13/13** checks. Temporary package
extractions are removed after each proof; no runtime or ledger is changed.

Authentik's held `+ak-fips` OpenSSL runtime is deliberately not replaced with a
generic Debian package. Its coupled provider/library build needs a compatible
vendor security update and native FIPS/provider review; package availability
alone does not establish compatibility or absence of the reported defects.
