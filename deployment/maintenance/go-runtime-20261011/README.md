# FMD and Yopass: compatible Go / OpenSSL security rebuilds

Reviewed/tested 2026-10-11 UTC. Staged only by this task; production release is a
separate operator step. No application source, module version, access policy,
retention setting, frontend bundle or schema was changed. Yopass also receives
one signed Debian vendor library update, with its genuine package metadata.

The [official Go release history](https://go.dev/doc/devel/release) records the
2026-10-08 security releases Go 1.26.9 and 1.27.2. These replace only the previous
patch-level compilers (1.26.8 / 1.27.1), on each application's existing branch.

## Inputs and output pins

| Application | Unmodified official source | Compiler image | Staged runtime |
| --- | --- | --- | --- |
| FMD 0.17.0 | `https://gitlab.com/fmd-foss/fmd-server`, commit `224b60c0756ff363bc19063082a8a1543559cf96` | `golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade` | `utilibre-fmd:0.17.0-go-security-20261011`, image ID `sha256:a092682df501ab35bbbde42638c9374131debd7d297a15f1cf3d09495b522858` |
| Yopass 14.10.0 | `https://github.com/jhaals/yopass`, commit `34d8bbcc4aac14dbf326d46dc69d26895b7f5282` | `golang:1.27.2-bookworm@sha256:5cf287a799e6b94384bad13d16b14904c531f51ba65792237e122ce42b392f61` | `utilibre-yopass:14.10.0-go-openssl-security-20261011`, image ID `sha256:6c193ee48e73d27af3360288fc577803add0743cfc33845e2430153da77b6390` |

The Dockerfiles pin the original application image and replace its two Go
executables, retaining the runtime user, command, entrypoint, environment,
volumes and ports. FMD remains static `CGO_ENABLED=0`; Yopass retains upstream's
glibc `CGO_ENABLED=1` build. No Alpine/musl substitution for Yopass.

`Dockerfile.yopass-openssl` uses the intermediate compiler-only image
`sha256:5f0522463f12d640cee398a7623126566a5625b92f8455e0dc790426b4428075`.
In a pinned Debian builder, APT verifies signed repository metadata and the
digest of `libssl3t64=3.5.7-1~deb13u3`. Its complete ten-file payload replaces
the old package; its own control record and md5 file replace the corresponding
distroless `status.d` entries. Unrelated inventory is untouched. This is not a
version-only metadata edit or a copied inventory from another installation.
The same library/file set remains; no new provider, shell, package manager,
crypto configuration or compiler is installed in the runtime.

FMD's official [release ZIP](https://packages.fmd-foss.org/server/fmd-server-v0.17.0.zip)
supplies the unchanged embedded `web/dist` bundle: SHA-256
`c89b6f8d1510edbf67355521039e64c08a3721dedff70dd5639bd7c5967716d6`.
Its publisher checksum was checked over HTTPS, not represented as a signature.
Its amd64 server/control binaries also matched those extracted from the pinned
official image. The existing deployed `fmd-web-v0.17.0-p3` readonly web override
remains unchanged; its privacy and map fixes must not be replaced during rollout.

`build-fmd.sh` and `build-yopass.sh` verify source-archive checksums and exact
commits, preserve VCS metadata, use `-mod=readonly` and `go mod verify`, disable Go
telemetry, and retain upstream build flags. The FMD builder installs the signed
Alpine `git=2.54.0-r0` package only in the discarded compiler container. Yopass's
upstream `pkg/yopass`, CLI and server tests passed. No module updates occurred.

## Bounded reproduction

Working directory: repository root. These commands expect the reviewed source
clones and inputs below; do not use a production data directory as build output.

- FMD clone: `/opt/utilibre/community-src/fmd-server`
- Yopass clone: `/opt/utilibre/community-src/yopass`
- Private build/receipt root: `/var/lib/utilibre-maintenance/go-runtime-20261011`
- Inputs: `input/fmd-source.tar`, `input/yopass-source.tar`, official FMD ZIP, and
  four original binaries extracted from the exact Dockerfile base images.
- Source archives are `git archive` of the commits above; expected hashes are
  enforced by the build scripts, not inferred from branch names.

Example FMD compile (run the analogous Yopass command serially, substituting its
pinned compiler, source clone and `build-yopass.sh`):

```sh
docker run --rm --name maintenance-fmd-go-build --cpus 2 --memory 4g \
  --pids-limit 256 --log-driver none \
  --tmpfs /work:rw,size=3g,mode=755 \
  -v /opt/utilibre/community-src/fmd-server:/source-git:ro \
  -v /var/lib/utilibre-maintenance/go-runtime-20261011/input:/input:ro \
  -v /var/lib/utilibre-maintenance/go-runtime-20261011/output:/output \
  -v "$PWD/deployment/maintenance/go-runtime-20261011:/recipe:ro" \
  golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade \
  sh /recipe/build-fmd.sh
docker build -f deployment/maintenance/go-runtime-20261011/Dockerfile.fmd \
  -t utilibre-fmd:0.17.0-go-security-20261011 \
  /var/lib/utilibre-maintenance/go-runtime-20261011/output
docker build -f deployment/maintenance/go-runtime-20261011/Dockerfile.yopass \
  -t utilibre-yopass:14.10.0-go-security-20261011 \
  /var/lib/utilibre-maintenance/go-runtime-20261011/output
docker build -f deployment/maintenance/go-runtime-20261011/Dockerfile.yopass-openssl \
  -t utilibre-yopass:14.10.0-go-openssl-security-20261011 \
  deployment/maintenance/go-runtime-20261011
node deployment/maintenance/go-runtime-20261011/check-build.mjs
node deployment/maintenance/go-runtime-20261011/check-fmd.mjs
node deployment/maintenance/go-runtime-20261011/check-yopass-vendor.mjs
node deployment/maintenance/go-runtime-20261011/check-yopass.mjs
```

Check free disk before compilation and preserve an 8 GiB recovery floor. Builds
ran sequentially with compiler/module caches in tmpfs, max 2 CPUs / 4 GiB RAM.
The browser bundles were not rebuilt. Native fixtures use isolated internal
Docker networks and fresh temporary data, with no logs or production credentials.

## Verified result

- `check-build.mjs`: all four binaries have the correct compiler/source metadata;
  exact linked dependency versions/checksums unchanged (FMD32 each,
  Yopass CLI16/server64; scanner totals additionally include main/std modules).
- FMD: protected registration rejects invalid token; two fictional accounts;
  opaque record roundtrip; cross-account and anonymous denial; native control
  binary version/list; both accounts deleted. Existing web override retained.
  **Not** a real-device, push, GPS or client-encryption test.
- Yopass: exact `/public` asset tar hash unchanged; native CLI encryption and
  decryption roundtrip; cache contains PGP ciphertext, not synthetic plaintext;
  one-time retrieval; simultaneous reads have one winner; actual configured TTL
  measured at3600s; expiry exercised with an accelerated1s synthetic cache key;
  non-one-time and longer-expiry requests rejected; uploads disabled; length
  limit enforced; fixture cache empty afterward. No one-hour wall-clock or new
  browser-compatibility claim.
- Vendor check: every installed libssl package file matches its actual vendor
  checksum; the package file set is unchanged; both compiled application
  executables and all nine unrelated package records are unchanged.
- Every fixture container/network and RAM-only account/cache store was removed.
  Production accounts, devices, messages and databases were never touched.

Private receipts: `build-verification.json`, `fmd-native.json`,
`yopass-native.json`, `yopass-vendor.json`, cleanup receipts and `*-scan.json`
under the private root. `yopass-final-scan.json` is the final vendor-layer scan;
`yopass-scan.json` records the earlier compiler-only intermediate.
Do not publish source links containing credentials or actual content keys.

Final staged scan with the current local Trivy database:

| Image | Inventory | High / critical findings |
| --- | --- | --- |
| FMD | 17 Alpine packages;34 Go packages per executable | 0 / 0 |
| Yopass final vendor layer | 10 Debian distroless packages;18 /66 Go packages | 0 / 0 |

Yopass's compiler-only intermediate still reported `CVE-2026-84782`,
`libssl3t64 3.5.7-1~deb13u2`. The separate real vendor payload update to
`3.5.7-1~deb13u3` fixes that package finding, without a scanner exception.
Scan results describe this database and inventory, not a security guarantee or
absence of all vulnerabilities.

## Release and rollback

Parent maintainer owns shared Compose and production rollout. Use immutable
image IDs above after checking receipts; retain existing commands, readonly
mounts, network restrictions, registration controls and retention. Source and
license publication must include this recipe alongside the unchanged upstream
source, without service secrets. Update provider/runtime locks after rollout.

FMD is stateful: retain the approved current account-work backup before release.
There is no schema change; rollback is the original image pin in
`deployment/community/compose.additions.yaml` with the same data/web mounts.
Yopass rollback is its original pinned image in
`deployment/community/compose.yaml`; recreate only the application, not its live
cache. Do not back up or copy short-lived encrypted messages for these tests.

After production rollout, check the public FMD sign-in and Yopass create/retrieve
journey using new synthetic input, then run the normal fleet security scan.
