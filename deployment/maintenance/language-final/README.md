# Runtime installer dependency repair — 2026-10-11

Scope: thirteen Python runtime images and fourteen npm 11 runtime images,
used by 33 existing containers, plus one unchanged Newsletters gateway that
must join its recreated web container's network namespace. No application upgrade, account policy,
network permission, retention setting or data migration is included.

## What changes

The reviewed Python images contain pip 26.2.1 and its vulnerable bundled
libraries even though applications do not invoke pip at runtime. The current
official pip release does not fix those copies. `Dockerfile.python` removes
the exact installer package, metadata and entrypoints, including the second
venv copies in Kitchenowl and LiberaForms. Application libraries are retained:
installing a new top-level urllib3 would not repair pip's separate vendor copy.
The Priviblur source publisher now obtains package/version metadata through
Python's native `importlib.metadata`, without requiring pip in the runtime.

The npm images retain their installer because RSSHub's supported entrypoint
uses `npm run start`. They receive npm 11.21.0 (Artistic-2.0), retaining npm's
native lifecycle and packing behavior, plus reviewed same-major
brace-expansion 5.0.11 and undici 6.28.1. The complete official npm archive is
checksum-pinned in `Dockerfile.npm`; the leaf artifacts come from the exact
already verified Actual image and its lockfile in `../npm-leaves/`.
Native npm update, audit and funding lookups are disabled through npmrc.
The separate fleet vulnerability scanner remains enabled.

Official source/version evidence checked on 2026-10-11:

- https://pypi.org/pypi/pip/json (26.2.1; bundled dependencies inspected).
- https://registry.npmjs.org/npm/11.21.0 (Node engine compatibility and archive integrity).
- https://github.com/npm/cli/tree/v11.21.0 (source and Artistic-2.0 license).
- https://docs.npmjs.com/cli/v11/using-npm/config (supported privacy settings).

## Reproduce and verify

Run one image at a time; `stage.py` verifies exact source IDs and the 8 GiB
disk floor. Manifests contain the finite allowed images and installer paths.
Use the reviewed base-image recipes first if reproducing on a new machine.

```sh
python3 deployment/maintenance/language-final/stage.py python public-egress
python3 deployment/maintenance/language-final/verify.py python public-egress
python3 deployment/maintenance/language-final/stage.py npm rsshub
python3 deployment/maintenance/language-final/verify.py npm rsshub
python3 deployment/maintenance/language-final/runtime-checks.py
node --test deployment/maintenance/language-final/release.test.mjs
```

Repeat the first pairs for each key in the corresponding manifest. Actual's
reviewed fixed-leaf image must have the exact ID asserted by `stage.py`.
Neither these stages nor verification accesses production data or restarts a
service. Images are exported as streams; all file bytes and symlinks outside
the explicitly allowed installer changes must match. Environment,
entrypoint, command, user, healthcheck, ports and image volumes are compared.
Trivy scans the resulting immutable image, not just a dependency manifest.

All 27 candidates passed. All 13 Python candidates passed isolated native
application-library imports, TLS context and SQLite operations. All five
actual egress-proxy configurations passed native Squid parsing. Native npm
lifecycle/pack passed with network disabled on all 14 npm candidates.
Extra fresh, isolated database tests passed for Authentik password/TOTP replay,
RSA/ECDSA OAuth exchange/JWKS/rejection, and LiberaForms two-account login,
mandatory-encryption form creation, owner access, access denial and SVG exports.
These checks do not claim browser/device coverage or a complete workflow in
each unchanged application. Private per-image reports record exact IDs,
rootfs comparisons and all remaining scanner findings.

## Guarded release and rollback

`release.mjs prepare` binds the exact passing receipts, source/runtime IDs,
normalized Compose settings, current health and relevant gateway responses.
Root reviews the prepared private receipt before explicitly running `pin`
and `apply`. The pin phase changes only exact `image:` scalars, including
the checked-in mirror of `/opt/utilibre/compose.yaml`.

```sh
node deployment/maintenance/language-final/release.mjs prepare
# After root review of /var/lib/utilibre-maintenance/language-final-20261011/release.json:
node deployment/maintenance/language-final/release.mjs pin
node deployment/maintenance/language-final/release.mjs apply
```

Services are grouped by their existing project. An audit of running container
network-mode dependencies found the Newsletters gateway; the helper explicitly
recreates it on the exact unchanged image and verifies its new namespace ID.
TRIP, 13ft and Unfurl use
their existing systemd supervisors so namespace egress restrictions are
rebuilt before gateways resume. Wallabag's supervisor is stopped around its
proxy replacement, then started again. Other projects recreate only the
listed services. Existing volumes, secrets, account work and temporary
content are neither copied nor deleted. Existing saved-work backups remain
unchanged; this installer-only release does not require a schema restore.

Every group requires exact running image identity and its existing native
healthchecks; selected gateways must retain their pre-release response.
Failure stops the release, restores only the group's previous source image
pins, recreates through the same native path, and verifies the exact old
images. Unknown rollback state is reported as unverified, never successful.
Old images remain available; rollback restores the old installer findings.

## Limits deliberately left visible

No vulnerability waivers are introduced. npm's http-cache-semantics 4.2.0
finding has no published fixed version. Application findings including
Kitchenowl's NLTK, Next.js, deepmerge-ts and nodemailer, and remaining
OS findings, are still reported. The subsequent
[four-service leaf repair](app-leaves/README.md) fixes the reviewed MySQL2 and
ADM-ZIP copies; its receipts supersede those four installer-only image IDs.
SimpleLogin's separate legacy virtualenv is not silently upgraded by this
patch. The four npm 10 images received the additional bounded repair below.
Grist's supported sandbox remains independent of the installer replacement.

The complete batch was deployed on 2026-10-11 after root review: all 24
project groups passed exact-image health/namespace checks. The authoritative
per-container status and timestamps are in
`/var/lib/utilibre-maintenance/language-final-20261011/release.json`.
Kitchenowl's initial 60-second wait raced its own 60-second health interval;
the old image was restored and verified before retrying. The corrected wait
derives from the native start-period/interval (maximum 180 seconds), without
overriding health. The candidate then passed the native check. Initial failure
and verified rollback evidence are retained in the receipt.
The additional post-release listener check found Newsletters SMTP waiting
safely for its existing one-use firewall permit after recreation. Its native
SMTP supervisor was restarted to install the namespace rules before releasing
that permit. The release helper now uses that supervisor explicitly and
tests its listener/boundary instead of treating a waiting process as ready.
The final `live-check.json` verifies all 34 image identities, all five Squid
listeners, the Newsletters namespace companion, native SMTP greeting and
IPv4/IPv6 restrictions. No message was sent and no user content inspected.

## Four remaining npm 10 installers — deployed 23:41 UTC

`npm10-images.json` records the exact predecessor and candidate images for
Projects, Kuma, Grist and Gathio's application (not its database). Their Node
22.23 runtimes meet npm 11.21's declared engine requirements. The shared
builder/byte verifier accepts an explicit checked-in manifest; it still
refuses base-image drift, arbitrary paths or changes outside the reviewed
installer files. Existing application code, native dependencies, startup
commands, image/runtime user and Compose settings are preserved.

The one separately reviewed removal is Kuma's unused `/usr/bin/cloudflared`,
matched by SHA-256. A read-only query returned no configured tunnel token;
environment, command and process checks likewise found no configured/running
tunnel. Kuma's supported optional tunnel feature is unavailable without that
binary. No active connection was removed, and no runtime download/replacement
is enabled. This is not a change to the public reverse proxy or TURN services.

All four candidates passed streamed full-rootfs comparisons and offline npm
run/pack operations, with unsolicited update/audit/funding requests disabled.
Additional network-disabled fictional gates passed fresh Kuma setup and
authenticated Socket.IO login; Grist passed sandbox escape denials, two-account
formula/document export/import and isolated saved-work restore again.
After release all exact images were healthy: public Projects and events pages,
Grist's unchanged identity redirect, Kuma's status page and denied public
administration routes passed. Gathio's new fictional event/ICS/deletion passed.
No real account work was opened; retired Grist QA identities stayed retired.

```sh
python3 deployment/maintenance/language-final/stage.py npm projects-npm10 --manifest npm10-images.json
python3 deployment/maintenance/language-final/verify.py npm projects-npm10 --manifest npm10-images.json
# Repeat stage/verify for the other three exact keys, then:
node deployment/maintenance/language-final/check-npm10.mjs
node deployment/maintenance/language-final/release-npm10.mjs prepare
# Review the private receipt before explicitly applying:
node deployment/maintenance/language-final/release-npm10.mjs apply
```

The completed receipts are `npm10-final-20261011/native.json` and `release.json`
under the private maintenance directory. Preparation caught an incorrect
historical monitor hostname and a process-list check missing Docker's required
PID column, before changing production. The verified canonical public status
URL is `https://status.utilibre.org/status/utilibre`.
Rollback restores only the corresponding previous image scalar and recreates
that single service; current volumes and saved work stay in place. Old images
are retained. This update does not fix application libraries requiring separate
major-version compatibility work or vendor-unfixed packages.
