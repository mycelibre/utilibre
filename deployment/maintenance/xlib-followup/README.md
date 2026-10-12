# Native X client library security maintenance — 12 October 2026

Status: all six native source variants built and five service candidates passed
isolated compatibility checks. The coordinating maintainer released the four
host packages and all five service images on 12 October, with exact live payload,
health and preservation gates passed. Three image groups were independently
reverified serially after completion (latest verification 15:33 UTC). This does
not claim every remaining security queue item is repaired.

This is a same-ABI backport, not a distribution upgrade or an upstream release
number substitution. Current Debian source tables still identify the affected
versions as unfixed; the referenced future X.Org releases were not available in
the upstream release archive when checked. The pinned upstream fixes are:

| Source | CVEs | Exact fix |
|---|---|---|
| libX11 | CVE-2026-88806 | [6d4432b](https://gitlab.freedesktop.org/xorg/lib/libx11/-/commit/6d4432b13c0b3b6a644c13de9c793a14db48d545) |
| libX11 | CVE-2026-94283 | [f263bbc](https://gitlab.freedesktop.org/xorg/lib/libx11/-/commit/f263bbca24d04c766775e7af2e203ca41b4ece2e) |
| libX11 | CVE-2026-94284 | [924fc91](https://gitlab.freedesktop.org/xorg/lib/libx11/-/commit/924fc91f08ece9cddc93609b4dc945a9cc90ea12) |
| libX11 | CVE-2026-94285 | [797eaf0](https://gitlab.freedesktop.org/xorg/lib/libx11/-/commit/797eaf0bd69524144e0df7af516b680f4b7694e9) |
| libXrender | CVE-2026-88807 | [0564bce](https://gitlab.freedesktop.org/xorg/lib/libxrender/-/commit/0564bce5446550c1b1681f3d8a933c20ea1455f7) |
| libXtst | CVE-2026-94286 | [b84737d](https://gitlab.freedesktop.org/xorg/lib/libxtst/-/commit/b84737d8400db7f06293822838d0e1c374cf71c4) |

Primary attribution: each corresponding
`https://security-tracker.debian.org/tracker/CVE-…` entry and the exact upstream
commit, inspected on 12 October. These are X client response parsing defects,
not proof of a public HTTP exploit against Utilibre. No malicious-X-server wire
fixture was invented; the fix assertion is exact upstream source provenance and
build equivalence, backed by native compatibility and isolation checks.

## Scope and versions

`specs.json` pins patch hashes and all original `.dsc` files.

| Native suite | libX11 | libXrender | libXtst |
|---|---|---|---|
| Trixie | `2:1.8.12-1+utilibre1` | `1:0.9.12-1+utilibre1` | not changed |
| Bookworm | `2:1.8.4-2+deb12u2+utilibre1` | not changed | not changed |
| DHI/Trixie | `2:1.8.12-1+dhi0+utilibre1` | `1:0.9.12-1+dhi0+utilibre1` | `2:1.2.5-1+dhi0+utilibre1` |

Only installed native runtime packages are overlaid. Native `libx11-data` stays
paired with libX11. Penpot's two private ImageMagick dependency copies are also
replaced and independently checked. The DHI exporter retains the actual signed
vendor source and quilt series; it is not replaced with a guessed vanilla
Debian equivalent. No libc, framework, app, database schema or retention change.

| Role | Candidate image | Tested image ID prefix |
|---|---|---|
| LiberaForms | `utilibre-liberaforms:xlib-security-20261012` | `37e9a53c7a16` |
| BreezeWiki | `utilibre-breezewiki:xlib-security-20261012` | `70ef5f33b43e` |
| Penpot backend | `utilibre-penpot-backend:xlib-security-20261012` | `919aa1b66c33` |
| Penpot exporter | `utilibre-penpot-exporter:xlib-security-20261012` | `f6228b23fb12` |
| Gathio database | `utilibre-gathio-documentdb:xlib-security-20261012` | `c36d9e56f372` |

Exact full bases and package lists are in `roles.json`; private `images/*/build.json`
bind every archive, ABI check and preserved directory to exact image IDs.
Gathio is based on the already repaired GDAL image `fd9252c7293a…`.
The concurrent OpenLDAP candidate must be **rebased serially** onto the released
Xlib image (or Xlib re-staged and retested after LDAP). Do not replace one with
the other simply because both have the same original base.

## Reproduction and provenance

Private evidence: `/var/lib/utilibre-maintenance/xlib-followup-20261012`.
`acquire.mjs` uses authenticated Debian source indexes from the established
Xserver/Python maintenance caches; DHI indexes are reverified with the pinned
vendor key through `xserver-followup/authenticate-dhi.mjs`. SHA-256 is checked
before extraction. Original licenses and notices remain in the source archives.

1. Run `node acquire.mjs`, then `node prepare.mjs` in a fresh work area. The
   preparation refuses to overwrite an existing source tree.
2. Run `sh build.sh trixie` and `sh build.sh bookworm`. The exact compiler image
   digests are pinned. Build dependency acquisition is in disposable containers;
   compilation occurs after their external network is disconnected. Each is
   bounded to 2 CPU, 4 GiB RAM and 256 PIDs, with an 8 GiB host free-space floor.
   Native package/dependency locks and build logs are retained privately.
3. Run `node verify-source.mjs`. Six source variants, 34 generated binary
   archives (including build-only packages), exact patch reverse dry-runs and
   the three native libX11 compose checks passed. Only the runtime subset enters
   images/host. Xrender/Xtst do not ship substantive native check suites here.
4. Run `node stage.mjs ROLE`. No compose changes occur. All old dynamic exports,
   exact SONAME/NEEDED sets, hardening flags and load dependencies are checked;
   all unrelated package versions, app/configuration and library bytes must match.

One vendor packaging exception is explicit: DHI libXtst's pinned
`01_fix_date_in_manpages.diff` (`23a0f0d34d8514db5da084b1b1a6631b474b1edd94b8bceffe2f5deff35991e2`)
retained obsolete XML-comment context. Fuzz 1 is allowed **only for that exact
documentation date-element patch**. Every security patch applies with fuzz 0
and reverses with fuzz 0. No executable source adaptation was needed.

## Observed checks

All on 12 October 2026, small fictional fixtures; no production users/data.

- Forms: two native logins, required-encryption form creation, owner answers,
  anonymous/other-account denial, avatar PNG, SVG dimensions/pixels and PDF.
  Reused `check-liberaforms-cairosvg.mjs`; not a browser key-recovery or SMTP test.
- BreezeWiki: actual Racket draw/save/reopen, same old/new PNG hash, isolated
  application homepage 200. No external wiki/media retrieval was used.
- Penpot: existing complete two-account edit/export/import/reload, permissions,
  native PNG export and deletion passed. Native PNG/JPEG/WebP/TIFF pixels and
  codec list match both default private and system-library modes; FontForge
  TTF/OTF and WOFF/WOFF2 round-trips pass. Frontend stayed unchanged.
- Gathio: existing PostGIS upstream `flatgeobuf --dumprestore` (2 tests, 0 failed),
  native BSON/geometry/UTF-8 data, projection, separate read-only role denied
  deletion, and logical dump/drop/restore passed, with network disabled.
- Host: exact old/new four-package payloads, 211 files; 17 other configuration
  files, unrelated package inventory, Docker/SSH PIDs and libc preserved.
  Three ABI comparisons pass. Signed Debian `xdpyinfo` (extracted, not installed)
  queries a real 128×96 Xvfb display and RENDER 0.11 under both old/new libraries,
  unprivileged and in an isolated network namespace. No host Xlib consumers were
  resident at preparation; apply checks again and refuses an unplanned restart.
- `node --test policy.test.mjs`: three focused gates pass, rejecting changed
  vendor lineage, unknown versions/packages, malformed hashes and extra APT work.

This is bounded compatibility evidence, not all-device coverage or proof of
absence of every upstream vulnerability. Raw scan findings remain until a
fresh exact-byte review is separately approved; these helpers do not edit the
security ledger or automatically exempt source families.

## Release and rollback

The coordinating maintainer reviews the private receipts, then prepares **all
three** image groups before applying any:

```sh
node deployment/maintenance/xlib-followup/release.mjs prepare forms
node deployment/maintenance/xlib-followup/release.mjs prepare expanded
node deployment/maintenance/xlib-followup/release.mjs prepare gathio
node deployment/maintenance/xlib-followup/release-host.mjs
```

`release.json` records native/lib byte checks, exact old/new refs, unchanged
configuration hashes, HTTP/native readiness, untouched containers and required
same-image network-namespace companions. `apply GROUP` is a separate, explicit
coordinator step: only the group's exact image scalars change, no build/pull
occurs, and any failed health/byte gate restores the original pins and containers.
Penpot backend and exporter move together. No application version/schema changes
or user-data restores occur; existing saved-work backup policy remains unchanged.
Gathio retains its existing native DB state and namespace companion handling.

During the real release, Penpot's unchanged frontend retained a stale backend
address after the backend container was recreated: internal readiness was 200
but frontend readiness was 502. Native `nginx -t` followed by `nginx -s reload`
resolved it without changing frontend configuration or container identity.
The helper now performs that supported refresh after expanded recreation and
rollback; its mock regression check forbids reload if configuration validation
fails. Native readiness gates remain unchanged.

The coordinator initially ran two independent apply groups concurrently, both
writing one receipt. Actual service gates passed, but one saved status could be
overwritten. The helper now takes an exclusive receipt lock. `verify-live GROUP`
performs all exact live/configuration/native gates without restarting or repinning.
Serial revalidation recovered Gathio's genuine completed timestamp from the
matching saved checkpoint and recorded a separate revalidation timestamp.
Never remove a stale lock before confirming no release process is active.

The host `--apply` requires preparation under 30 minutes old, identical archives,
recipes, source proof and unrelated inventory. APT simulation must request only
the four reviewed native replacements and no additions/removals. It installs
those archives with `dpkg`, checks exact live files and native display operation,
and refreshes the fail-closed unattended blacklist. A failure reinstalls the
authenticated original four archives. No Docker/SSH/network restart is allowed.
Private `host/release.json` is created only on explicit apply; never overwrite it.

`review.mjs` produces only a fresh-scan-bound draft for the six named CVEs and
the exact patched versions/roles. Its strict applier policy does not cover other
X packages, other CVEs, unrelated services or stale versions. `advisory-patch.mjs`
separately emits a reviewable unchanged-application binding patch after proving
all live image identities, native bytes and image-only compose changes; it does
not clear dependency findings. The coordinator applies both only after review.

No scheduled updates may silently replace these `+utilibre` artifacts. Upstream
retirement requires compatible vendor fixes for each named CVE, the same native
and application gates, new exact receipts and review of source/guard retirement.

## Corresponding source

`publish-source.mjs` publishes only original source archives, exact patches,
native build locks, required notices and the allowlisted reproducible recipes.
It excludes compiled packages, secrets, private logs and user data. The public
filename is `security-xlib-followup-20261012-source.tar.gz`, available under the
existing `/utilibre-source/` mount. Public HEAD returned 200 on 12 October;
11,151,323 bytes, SHA-256
`0fb6356e19f32369fbbad3ea462397e2c4a3d417a4bab705c62e1c41696f5883`.
The coordinating maintainer can insert these two paragraphs in the existing
source index; this task does not republish that shared index:

```html
<p lang="en"><a href="security-xlib-followup-20261012-source.tar.gz">Native X client library repair source</a>: complete Debian and DHI sources, exact upstream fixes, original notices, native build recipes and compatibility checks.</p>
<p lang="es"><a href="security-xlib-followup-20261012-source.tar.gz">Código de las correcciones de las bibliotecas cliente de X</a>: código completo de Debian y DHI, correcciones originales, avisos, procedimientos de compilación y pruebas de compatibilidad.</p>
```
