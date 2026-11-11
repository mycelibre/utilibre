# 11 November: updater receipts and BentoPDF

## Held upgrades: second checkpoint

Chhoto 7.11.3-p1, ByteStash 1.6.2-p1, WBO 2.18.33-p1, Candlr 2.4.0-p1
CryptPad 2026.10.1 and KitchenOwl 0.8.1-p1 are deployed. With the earlier Wakapi and GridSpace
updates, the matrix now records **8 deployed / 22 held** candidates. See the
[native checks, host inspection and recovery record](../../../docs/records/held-upgrades-2026-11-11.md).

`held-inputs.json` and `held-policy.mjs` bind the five image replacements to
their exact source, lockfile, recipes, evidence and images. The existing release
adapter accepts `SERVICE --apply --held-nov11` only for those reviewed inputs.
`prepare-held-sources.mjs` prepares corresponding source independently of
activation; the existing source publisher uses `SERVICE --held-nov11`.
It rejects stale historical Chhoto/Candlr recipes before publication.

CryptPad retains its runtime image and replaces a verified source tree.
`cryptpad-upgrade.json` binds its migration, two-client and Office checks;
`release-cryptpad-upgrade.mjs --apply` reuses the release lock/rollback driver,
validates an encrypted native backup, then changes only that source mount.
The old source and saved-account snapshot remain private. Its native source
publisher includes the exact vendored repair. No plaintext documents or
credentials are included in source offers.

The archived tests use the recorded fixture ports and protected evidence
directory. Replay them only in an isolated environment with the exact retained
inputs; do not overwrite previous reports. A passing historical test is not
current advisory clearance. No byte-identical build claim is made.

[KitchenOwl's recipe](KITCHENOWL.md) records the native sign-in timing repair,
repaired-system Psycopg driver, offline Flutter build and migration/recovery
checks. Preparation never activates the candidate. The completed release and
new portal metadata have their own exact artifact/evidence bindings.

`review-candlr-upgrade.mjs` revalidates 46 exact prior Debian component
decisions against the completed release and full filesystem comparison. It
requires the same advisory snapshot, exact old queue hash and still-valid
original expiry. Its private output is applied separately with the existing
triage command; the ACL finding remains open. Its explicit `kitchenowl` mode
uses the same checks for 226 prior unchanged Debian component decisions with
a separate SHA-bound queue and the original expiries. The 18:19 UTC fleet assessment
completed 109 images, 113 source inputs and host packages. See the release
record for the separately discovered unmanaged host-tool coverage gaps.

## Held application upgrades and disk follow-up

Wakapi 2.18.2 and GridSpace 4.7.3-p1 are deployed with retained repairs and
native workflow checks; their two catalogue records are also released.
`upgrade-status.json` records all 30 reviewed candidates and the current held
upgrades, including unsupported inventories and conflicting patches. It does
not declare the entire upgrade queue complete. The ACL caller gap remains open.

See [the release, cleanup, evidence and rollback record](../../../docs/records/upgrade-closure-2026-11-11.md).
`upgrade-inputs.json`, `grid-upgrade.json` and `upgrade-portal.json` bind the
finite approved artifacts. `build-wakapi.mjs` prepares only the declared
revision with retained locks/backport; `check-wakapi-upgrade.py` reuses the
existing synthetic native fixture. `prepare-upgrade-sources.mjs` prepares
matching source offers without publishing them. Existing release adapters
perform scoped activation separately. No new scheduler or LLM is required.

`review-wakapi-upgrade.mjs` proposes one exact runtime review from the retained
backport and new native/live-binary evidence; it does not reproduce a
vulnerability or suppress the raw finding. The prior conditional Go-source
reviews are revalidated against the new live Wakapi artifact. Review changes
expire and remain distinct from source fixes or deployment approval.

## Signed libxslt and Kerberos follow-up

`vendor-inputs.json` captures 31 exact predecessor images and official
same-branch Alpine packages for 94 pending high package-target records. It
extends the existing finite preparation, consumer-test and transactional
release adapters. Approval is explicit; a scanner result cannot grant it.
See [the verified inputs, replay commands, release evidence and rollback
limits](../../../docs/records/vendor-libraries-2026-11-11.md). The separate ACL
caller-migration findings remain open. This recipe does not approve a different
upstream release or automatically enable any service.
[`vendor-status.json`](vendor-status.json) records the completed 75-group release,
exact artifacts, final scan coverage and the remaining 30 ACL records.

## Stateless library follow-up

`libraries-inputs.json` captures a separate signed-vendor update for 23 existing
stateless frontends: zlib 1.4-r0 and, in the 22 nginx images, libxpm 3.5.20-r0.
Both packages come from the same Alpine 3.24 branch already installed. There
are no application, privacy-policy, storage, access or port changes. The
earlier BentoPDF/portal runtime findings documented below describe their
predecessors; see `libraries-status.json` for the later deployment state.

This extends the existing finite zlib preparation/scope/scanner adapters with
`--libraries-nov11` and reuses the existing nginx/Node checks and transactional
Compose helper. It does not start another updater or scheduler. The approved
inputs, signed APK hashes, predecessor images, fixture hashes and private raw
proofs are required. Never substitute an unreviewed newer package or base.

Private evidence and retained inputs:
`/var/lib/utilibre-maintenance/libraries-20261111/`. Keep these inputs and the
predecessor/candidate images; Git alone is not a complete runtime backup.
The preparation path deliberately refuses existing proof directories instead
of overwriting successful or failed evidence. To replay historically, restore
the captured inputs into a separate staging environment with the same private
layout. It neither pulls images nor downloads packages during preparation.

```sh
# KEY is one exact key from libraries-inputs.json; preparation never releases.
node deployment/maintenance/security-20261109/zlib-prepare.mjs --libraries-nov11 KEY
python3 deployment/maintenance/security-20261109/check-musl-nginx.py --libraries-nov11 KEY
# Portal uses the existing Node consumer instead of the nginx command:
python3 deployment/maintenance/security-20261109/zlib-check.py --libraries-nov11 --runtime public-utility-portal
python3 deployment/maintenance/security-20261109/zlib-scan.py --libraries-nov11 KEY
node --test deployment/maintenance/releases-20261111/libraries-policy.test.mjs
```

The new XPM fixture opens/writes a fictional two-by-two-pixel XPM through the
native library without an X server. It is an ordinary compatibility test, not
a vulnerability reproduction. The library API reports 30411, independently of
the 3.5.20 package release. An initial incorrect API-version assumption and an
incomplete package-file allowlist were rejected during preparation, preserved,
then corrected. The allowed vendor payload includes libXpm's native `cxpm` and
`sxpm` utilities. No unrelated file content, mode, owner, link, package record
or image configuration may change; archive timestamps are not compared.

The scan cache holds the recorded advisory DB and the separate Java package
index. Scanning draw.io initially failed because the latter was absent; that
failure remains recorded. The existing local index was copied without a
network refresh, and draw.io's baseline was repeated with it. Scans run in a
network namespace with no external network, no ignore file, and no advisory or
registry update. A successful historical replay is not current clearance; the
release gate requires an advisory snapshot less than 48 hours old. The older
Java index identifies packages and is recorded separately from advisory data.

Reviewed activation uses exact artifacts and only existing services:

```sh
node deployment/maintenance/releases-20261111/release-libraries.mjs prepare KEY
node deployment/maintenance/releases-20261111/release-libraries.mjs apply KEY
# Exact retained predecessor; no data migration, deletion or restore:
node deployment/maintenance/releases-20261111/release-libraries.mjs rollback KEY
```

Release requires explicit `releaseApproval: approved`, unchanged evidence,
complete native package inventory, no high/critical candidate findings, and
all normal compatibility checks. It checks namespace dependencies, preserves
all non-image Compose settings and existing bind addresses, acquires the
existing exclusive release lock, recreates only the selected service, and
verifies health and the existing public home where configured. A repeated
apply validates the deployed state without another restart. A failed rollout
uses the existing transaction helper to restore the previous pin and image.
Rollback does not silently bypass a changed configuration or missing artifact.

Only the protected portal `PORTAL_IMAGE` value and the other selected Compose
image scalars change. No host restart, notification, indexing request, backup
change or application migration is included. These stateless checks do not
establish new browser/device coverage. Stateful/gateway packages and the
separate ACL caller migration remain outside this release.

Changing shared verification scripts must not invalidate completed repairs.
`recorded-checkers.json` binds the old scope checker and nginx fixture to their
exact source in commit `271686f`, for 30 specific previously deployed images.
The complete historical proof gates still pass; unknown image IDs or changed
hashes are rejected. New builds continue to use current checker bytes. This
is source/evidence identity, not an advisory exception, finding suppression or
permission to activate a stale candidate. No historical reproduction fixture
was rerun. Retained evidence was read and checked only.

Future application upgrades must preserve these package versions by building
on the reviewed runtime or replaying the signed package step with new baseline
and consumer proofs. This finite recipe does not automatically approve another
upstream version, modified package, or arbitrary descendant image.

This batch reuses the existing updaters, native BentoPDF build, air-gap packager,
source publisher and scoped release helpers. It adds no scheduler or service.

## Updater audit

SearXNG's exact upstream image and writable-layer guard passed. Redlib's last
scheduled run had succeeded, but a later change to the shared Debian build
adapter made its historical APT-overlay receipt fail validation. Its archived
builder and ABI checker both match commit
`f5c2e09f812e920a3b1c95e8c6673227abf1ca6d` exactly. The historical verifier now
allows that revision for the single installed Redlib image
`sha256:33db5cc7e6acb445a3db73408c82fcedf42cbf2d0d604ce4261d8fd952131356`.
New builds still require the current adapter; unknown images remain blocked.
The ordinary Redlib `--check` reports `up-to-date`. No restart or Reddit request
was needed. An archived repair proof is not current security clearance.

Recheck without searches, deployment or notifications:

```sh
python3 scripts/test-searxng-maintain.py
node --test scripts/test-redlib-maintain.mjs deployment/maintenance/security-20261109/vendor-debian-policy.test.mjs
node scripts/redlib-maintain.mjs --check
```

The first two commands are offline tests. The last makes one upstream-head
lookup, reads local evidence and writes its private check receipt.

## BentoPDF inputs and build

Upstream 2.8.11 is pinned to
`f638f8e4db66cb69dec35ca061ad89034dd62445`. Apply
`bentopdf-dependencies.patch` with `git apply --check` followed by `git apply`
in a clean detached checkout. It pins node-forge 1.4.1,
i18next-http-backend 4.0.4 and VitePress's build-only Vite 6.4.5. It does not
replace PDF processing or cryptographic algorithms. The old 2.8.8 lockfile
patch is historical and must not be applied to this revision.

Use the existing Node 24.21.0 Alpine image
`sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`.
Resolve nothing during replay: `npm ci --ignore-scripts --no-audit --no-fund`
uses the reviewed lock. Dependency acquisition needs the exact lockfile
destinations (npm registry and SheetJS); runtime asset acquisition uses only
`deployment/toolbox/bentopdf-runtime-lock.json`. Then run the existing build
adapter inside a non-root, networkless container with only the disposable
checkout writable, no production mounts and no Docker socket:

```sh
node /integration/build-bentopdf.mjs /work
# In a SECOND clean checkout with the same patch and dependencies:
NODE_OPTIONS=--max-old-space-size=4096 npm run docs:build
```

The application build used two CPUs and 4 GiB; the separate documentation
build used two CPUs and 6 GiB. Do not reuse their generated output directories. The application adapter caps its
Node heap at 3 GiB; the documentation build needs a larger heap than Node's
default. This is build-time demand, not the static service's runtime budget.

After the build, run `prepare-bentopdf-airgap.mjs SOURCE NEW_OUTPUT_DIRECTORY`.
It refuses a different source revision or an existing output directory, checks
the runtime downloads and retains component licenses. Signature validation stays
disabled. PDF engines, workers, OCR English/Spanish data and fonts stay local.
Hyper Compress 1.0.3 is upstream AGPL-3.0-only, with matching source tag commit
`148f20f3f4cd11035fdd53dd1c20fb5a5d21cf3b`; its source archive is retained with
the published application source.

`deployment/toolbox/Dockerfile.bentopdf` replaces only the static application
directory on the exact previous runtime image. Retain that image for replay
and rollback; do not substitute a moving nginx tag. This preserves the existing
nginx, Expat, TIFF, zlib and musl repairs. No application data migration exists.
Use the local image-ID builder path (BuildKit interprets this raw ID as a remote
repository). No image pull or build-step network is permitted:

```sh
DOCKER_BUILDKIT=0 docker build --network none --pull=false \
  -f deployment/toolbox/Dockerfile.bentopdf \
  -t utilibre-toolbox-bentopdf:2.8.11-p1 \
  /opt/utilibre/pack-static/bentopdf-2.8.11-p1
```

The reviewed image ID is in `bentopdf-release.json`; rebuilding must produce a
new candidate and fresh review if its ID differs. Byte-for-byte reproducible
builds are not claimed. Preserve the pinned predecessor image: a Git checkout
alone is insufficient to reconstruct its runtime repair layers.

## Verification and evidence

Private evidence is under
`/var/lib/utilibre-maintenance/releases-20261111/`. Source scans include build
dependencies. Before/after scans share a preserved Trivy database; they do not
silently refresh it. Raw remaining findings stay in the reports.

The workflow checker uses synthetic PDFs and the checkout's pinned PDF.js
parser in a separate, entirely intercepted test context. It no longer relies
on a minified application export name. `--local-candidate` maps only
`pdf.utilibre.org` to a loopback-only HTTPS candidate. Without that flag it
checks the public deployment. Set `BENTO_TEST_SOURCE` to the reviewed checkout.
The Markdown check verifies native print invocation and Chromium PDF output;
it cannot automate a user's operating-system Save as PDF dialog. This is
desktop Chromium coverage, not a claim about all tools or real phones.

Release/rollback status and artifact identities are recorded alongside the
private evidence. The prior image and Compose configuration are retained;
rollback changes the application image only, with no user-data deletion.
The separate ACL caller-migration issue remains open.

## Exact release interface

The reviewed manifests bind the source lock, integration hashes, browser
report, filesystem comparison and same-database scans to the candidate IDs.
BentoPDF's release gate requires an advisory database no more than 48 hours
old. This is a release policy, not a claim that older evidence is current.
The source scan has zero high/critical findings; three medium and one low
remain. The unchanged BentoPDF runtime retains two medium findings (zlib and
libxpm); the unchanged portal runtime retains one medium zlib finding.
Scans sharing a cache must run sequentially: an attempted parallel portal
scan was rejected by the cache lock, then rerun successfully. Its failure log
is preserved rather than counted as a pass.

After committing the reviewed source, publish the application source using
`node deployment/pack/publish-source.mjs bentopdf`, then:

```sh
node deployment/maintenance/releases-20261111/release-bentopdf.mjs --prepare
node deployment/maintenance/releases-20261111/release-bentopdf.mjs --apply
node deployment/maintenance/release-refresh-20261106/release-portal.mjs --apply --bentopdf
node scripts/publish-integration-source.mjs
```

These are production operations: they require the established deployment
authorization. Only BentoPDF and portal may be recreated. No migration,
notification, indexing request, cache purge or new public service is included.
The two release helpers acquire the existing exclusive package-release lock.
A repeated successful apply verifies the exact running image and does not
restart it. Compose settings and predecessor artifacts are retained privately.

BentoPDF rollback is the exact `--rollback` mode of its release helper. Restore
the previous portal `PORTAL_IMAGE` line recorded in
`portal-first-release/portal-release.json` for a whole-batch rollback (the final
`portal-release.json` rolls back only the attribution-label correction), then
use the existing scoped portal Compose process (`up -d --no-deps --no-build
--pull never portal`) and check its health. Restore the matching prior source
archive/index from the publisher's recorded staging directories when rolling
back the public application. No browser documents are deleted by either step.

The final portal follow-up marks BentoPDF as locally modified, acknowledging
the dependency patch. Both portal artifacts passed the same runtime and unit
checks; the first release receipts remain under `portal-first-release/`.
`source-rollback.json` identifies the original 2.8.8 source-offer backup.
