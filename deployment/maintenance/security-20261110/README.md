# 10 November 2026: Kerberos, Symfony and Kuma maintenance

Status and the exact deployed artifacts: [status.json](status.json).
Operator outcome: [release record](../../../docs/records/security-maintenance-2026-11-10.md).
Private evidence root: `/var/lib/utilibre-maintenance/security-20261110/`.
These are finite extensions of the existing build, scan and release adapters,
not an unattended upgrade mechanism or authorization for future deployment.

## Inputs and correction

- `kerberos-inputs.json`: authenticated MIT Kerberos **1.22.3**, exact Bookworm/
  Trixie package hashes, 16 base images, compiler identities and required checks.
  Addresses CVE-2026-112321, 112322, 112323 and 119079. Debian package versions
  are `1.22.3-0+utilibre1~deb12u1` and `~deb13u1`.
- `symfony-inputs.json`: replace only `ScopingHttpClient.php` with the compatible
  upstream **5.4.56 / 7.4.23** source for Wallabag/Pollaris (CVE-2026-121971).
  Existing header and ExpressionLanguage repairs remain. Composer metadata is
  deliberately unchanged; raw scanner matches require exact-source review.
- `kerberos-driver-inputs.json`: KitchenOwl's existing Psycopg2-binary **2.9.12**
  rebuilt against system libpq **17.11**, replacing 15 bundled libraries. This
  is necessary because that wheel imported two removed private Kerberos helpers.
  Source version, accounts, database schema and application settings are unchanged.

Upstream sources: [MIT release](https://web.mit.edu/kerberos/krb5-1.22/krb5-1.22.3.html),
[Symfony advisory](https://github.com/symfony/symfony/security/advisories/GHSA-gq53-v8w2-gjhj),
[Psycopg2 2.9.12](https://pypi.org/project/psycopg2-binary/2.9.12/).
The pinned commits, source hashes and signing fingerprint are in the manifests.

## Rebuild boundaries and order

Run from the repository root. Preserve completed evidence and image identities.
The following describes the recorded sequence, **not commands to replay against
the already-updated live installation**. Existing adapters reject a different
baseline, completed evidence, missing files or stale checks. A future upstream
revision needs its own reviewed manifest; do not substitute a moving tag.

1. Restore the authenticated source, packaging archives, exact `.deb` inputs and
   local frozen compiler images named in the manifests. Source offers do not
   contain compiler images. Missing artifacts are a prerequisite failure; do not
   silently resolve newer compiler/dependency packages. The retained acquisition
   logs and signed-package metadata establish the original provenance.
2. `python3 deployment/maintenance/security-20261110/kerberos-prepare.py bookworm`
   (and `trixie`) prepares clean source and sequentially checks the 11 integration
   patches without fuzz. `--root /absolute/disposable/root` supports isolated
   preparation with `source/` and `packaging/` inputs and empty suite directories.
   Reusing an existing candidate directory fails without overwriting it.
3. `sh deployment/maintenance/security-20261110/kerberos-build.sh bookworm`
   (and `trixie`) uses the recorded local compiler, network disabled, 2 CPUs,
   4 GiB RAM, finite work tmpfs and unprivileged compilation. The full upstream
   security test suite is not run. Ordinary API and isolated KDC/GSS/SPNEGO
   checks are separate required evidence. Failed build logs remain available.
4. Existing `security-20261109/vendor-debian.mjs --kerberos-nov10 KEY` prepares
   each finite image using pinned packages, verifies unrelated files/configuration
   and runs 15 ordinary API checks before/after. It does not deploy.
5. For KitchenOwl, first preserve the OS candidate. Rebuild the exact driver with
   `sh deployment/maintenance/security-20261110/kerberos-driver-build.sh /absolute/new/output`.
   This isolated build has no network or production mounts (1 CPU, 768 MiB,
   300-second timeout). Verify the extension hash and exact libpq package before
   staging them in `kerberos/kitchenowl/output/`. `kerberos-driver.py` checks the
   complete image scope. `promote-kitchenowl.mjs prepare` joins that candidate,
   preserves `os-only/build.json`, and requires new payload/ABI/app/scan evidence.
   Its `verify` mode only checks an already-recorded join; it changes nothing.
6. `kerberos-consumers.py KEY`, `kerberos-payload.py KEY` and the existing
   `security-20261109/check-vendor-abi.py --kerberos-nov10 KEY` verify actual ELF
   consumers, all native payloads, public symbols, dependencies and SONAMEs.
   Only two named private helper removals are allowed; mounted/future plugins
   are outside this evidence. The complete application gates remain mandatory,
   including Gathio database restore, TURN protocol/limits, and KitchenOwl account
   isolation/import/export plus a real isolated PostgreSQL transaction.
7. Symfony uses the existing `security-20261028/symfony.mjs --batch-20261110
   --symfony wallabag pollaris` adapter with the recorded upstream source files
   and commit responses. Its ordinary fixture covers 20 legitimate operations
   per image before/after. Full-image scope and separate native/browser app
   checks must pass, including two accounts/sessions and export/delete.
8. Existing `scan-brotli.mjs --batch-20261110 --vendor-debian KEY` (or `--symfony`)
   assesses before/after artifacts with the **same recorded local Trivy DB**.
   The source/payload gate, coverage and zero-new-high/critical comparison must
   all pass. Retained version metadata is not rewritten to hide findings.
9. Only a separately authorized scoped release may call the existing
   `release-brotli.mjs --batch-20261110 PROFILE prepare|apply KEY`. Prepare and
   apply retain exact baseline/configuration, age, activity and rollback checks.
   `--vendor-debian` and `--symfony` are the only allowed November 10 profiles.
   The two TURN groups share a candidate but retain independent activity checks.

`kerberos-host.py prepare|apply` is a separate finite host-library operation,
not a cron recipe. It accepts only the four recorded old packages, verifies
rollback files and no resident host consumers, and rejects existing completed
receipts. The completed release restarted no host service. A future active
consumer or changed host state needs another operational decision.

## Review, evidence and repetition

`check-kerberos-policy.mjs` validates all 16 recorded candidates, eight negative
cases and two scan-comparison boundaries without network or Docker. Source
preparation was repeated from clean copies for both suites; repeating it on an
existing workspace rejected safely. The isolated driver rebuild matched the
recorded extension hash. **Whole images and Debian packages are not claimed
byte-reproducible**; freshly rebuilt artifacts still need new exact hashes/tests.

`review-kerberos.mjs` and existing Symfony/source/component reviewers prepare
exact, expiring decisions from current payloads and release ancestry. They do
not authorize arbitrary repairs. `triage.mjs record-batch` records only a
reviewed, current-scan batch. Historical source inputs and raw findings remain.
Changing shared release code invalidates conditional historical Go reviews;
the existing 50 guard and 83 condition-policy tests must pass before renewing
those 22 exact conditions. No permanent suppression is introduced.

Selected evidence: `vendor-debian/*/{build,consumer,payload,scan-gate}.json`,
`vendor-debian/release.json`, `symfony/*/{build,inventory,application,scan-gate}.json`,
`symfony/release.json`, `kerberos/{bookworm,trixie}/output/realm.json`,
`kerberos/host/release.json`, `kerberos/policy-checks.json`,
`kerberos/source-replay-check.json`, `kerberos/kitchenowl/replay/result.json`.
Raw logs, source inventories, account fixtures and scanner evidence remain private.

## Source publication and rollback

`publish-kerberos.py` makes the additive `security-kerberos-20261110-r2-source.tar.gz`
offer with complete source, notices, signed inputs, packaging and final recipes.
It preserves the first archive and excludes runtime data/configuration/secrets.
The existing Symfony publisher's `--batch-20261110` mode supplies both exact
component trees with MIT notices. Public archives are under the existing
`/opt/utilibre/toolbox-public/` source-serving mechanism.

Rollback inputs are each release receipt's `oldImage`/`oldRef`, retained locally.
Use the existing scoped release procedure to restore only the affected group's
exact image pins, then check its configuration, health, namespace companions
and route. Never deploy a historical tag without checking its actual image ID.
No database migration was performed; rollback of an image is not rollback of
later user data. For host libraries, the four exact authenticated old `.deb`
files are in the private host preparation receipt. Recheck resident consumers
and arrange a maintenance window if needed before any host rollback.

## Still open

Thirty `libacl1` CVE-2026-54369 records need a compatible caller/library migration;
the previously attempted custom repair/reproduction path was rejected by
automatic approval review. It was not retried or suppressed. Kuma's optional
Apprise integration was subsequently confirmed unused and its removal explicitly
approved. The [finite removal recipe](kuma-without-apprise/README.md) removes
Apprise and Python-Markdown while retaining native notifications, monitoring and
saved configuration. It does not repair Python-Markdown upstream. The separate
ACL records remain open. Expiring review is not a security clearance.

The 15:46 UTC read-only follow-up rechecked all 30 high ACL records across 36
host/container locations, without a new vulnerability reproduction or runtime
change. The signed-vendor assessment does not establish a compatible complete
caller migration. The new Kuma image's separate medium CLI-only attribution was
revalidated and recorded with seven-day expiry; the CLI tools are absent. The
two existing CLI-review policy tests pass and reject applying that disposition
to the high library issue. See the release record's ACL follow-up and
`status.json.aclFollowup` for exact private evidence identities. No ACL source
repair or high-finding closure is claimed.
