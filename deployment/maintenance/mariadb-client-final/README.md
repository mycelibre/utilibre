# Coturn client-library patch — 11 October 2026

Both existing PairDrop and Galene relays now use
`utilibre-coturn:4.18.0-client-security-20261011`, image
`sha256:abdba9b317da98ca9962d33ca4a552f5a8b784a86d996e0adf10575132bff625`.
The native Coturn binary is byte-identical. Listener, credentials, firewall,
quotas, logging, certificates and application settings are unchanged.

The preceding minimal-runtime layer removed unused Bind DNS helper packages,
LMDB and libxml2. This final layer installs only signed Debian
`libmariadb3` and `mariadb-common` **1:11.8.9+ds-4**, replacing
`1:11.8.6-0+deb13u1`. These are a compatible client library and configuration
package, not a MariaDB server upgrade. The installed runtime satisfies their
dependencies; `dpkg --audit` and native dependency resolution pass.

Debian's isolated signed package indexes authenticated the downloads; their
SHA-256 values are pinned in the Dockerfile. Do not enable sid for the host
or broadly upgrade either image. The source review and exact artifacts are
under `/var/lib/utilibre-maintenance/mariadb-client-final-20261011/`.
[Debian's Connector/C advisory](https://security-tracker.debian.org/tracker/CVE-2026-44172)
identifies the real client escaping issue and fixed version. This update is
not a blanket waiver of MariaDB source-package findings.

## Verification and rollout

`release.mjs prepare` runs the isolated native protocol fixture and binds its
result to the exact image ID and normalized production configuration.
`apply` requires only the reviewed image-pin changes, checks both relay port
ranges for zero allocated sockets twice, and replaces one relay at a time.
Its rollback restores only that relay's old image pin, never user data.
Both deployments passed their native STUN response gate.

The isolated tests cover UDP, TCP and TLS allocation, anonymous challenge,
wrong-password rejection, private/metadata peer denial, four-allocation quota
and fifth refusal, exact-byte bidirectional transfer, and native deletion.
The optional benchmark-range internal test subnet is collision-checked and
never exposed publicly. Fixture permissions are explicit: a restrictive
release-runner umask must not make the synthetic configuration/certificate
unreadable to the unprivileged test relay. The rejection test caught that
harness problem; no production permission was relaxed.

Bounded live checks use `deployment/community/turn/check-security.py
--bounded-live` and `deployment/maintenance/native-final/check-coturn-live.py
--galene`. They do not exhaust public quotas or measure external throughput.
The private exact-image release receipt is `release.json` in the directory
above. This does not prove every external NAT/browser path.

## Reproduce / rollback

Build from the exact retained minimal-native image
`sha256:42d3309a92b6e573ffdcdf971cf65fd50dcc6cb3e6e9ed9ca49f7f17cf482b79`
with the two authenticated `.deb` files, the checked-in Dockerfile and
`--network=none`. Keep the base image and original relay image available.
For an emergency rollback, wait for no active allocations and restore only
the affected Compose pin to `utilibre-coturn:4.18.0-minimal-native-20261011`,
then recreate that service with `--no-deps --no-build --pull never` and repeat
the native checks. The previous client-library vulnerabilities return on
rollback; credentials and saved configuration must remain unchanged.
