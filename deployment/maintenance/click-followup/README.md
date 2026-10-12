# Kuma Click maintenance — 12 October 2026

**Deployed:** Kuma remains 2.5.6, Apprise remains 1.10.0. Only the signed Debian
`python3-click` package changes from 8.1.3-2 to **8.3.3-3**. No application,
configuration, native libraries, unrelated Python files or other packages change.
The package's BSD licence and notices remain installed. The candidate is pinned
in `stage.mjs`; authenticated archive indexes bind its SHA-256, not a moving tag.

[Debian's CVE-2026-7246 record](https://security-tracker.debian.org/tracker/CVE-2026-7246)
explicitly records that Pallets disputes this CVE. This is defense in depth,
not a claim that Utilibre exposed a confirmed remote exploit. The upstream
[8.3.3 source](https://github.com/pallets/click/tree/8.3.3) launches the editor
using an argument vector without a shell. It supports the existing Python 3.11.

Seven native checks cover that source property, Apprise help/version and invalid
arguments, fictional endpoint parsing without delivery, Unicode/options and the
native editor/file API with spaces. Kuma's existing fresh SQLite setup and
authenticated Socket.IO test passed in an isolated container with no network;
synthetic tmpfs state was removed. No real notification was sent. Production
health and the existing status route passed after the exact-image rollout.

Run `stage.mjs`, then `application.mjs`, then `release.mjs prepare`. Review the
proofs, change only the existing Kuma image scalar in community Compose, and run
`release.mjs apply`. The existing rollback/Compose readiness helper is reused.
The initial harness needed a fixed Docker hostname, literal dpkg format quoting,
and the renamed upstream `edit_files` method; those failed checks caused no
production mutation and were not counted as passing tests.

Private evidence and a consistent pre-release SQLite snapshot are under
`/var/lib/utilibre-maintenance/click-followup-20261012/`. This snapshot is local
recovery material, not a claim of an off-host backup or a new retention policy.
For rollback, use the exact predecessor from `release.json`, change only its
image scalar and recreate `uptime-kuma` with the established Compose flags;
verify health/status. Check later overlays first. Do not restore or remove user
data merely to reverse this dependency change. The release enforces 8 GiB free.

Application advisory bindings are separately revalidated; no blanket dependency
exemption is granted. Fresh scanning still needs to include the final running
image after any subsequent LDAP/sudo overlay. The broader security queue remains
open.
