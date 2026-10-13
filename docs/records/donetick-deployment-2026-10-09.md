# Donetick deployment and native verification, 9 October 2026

Public HTTPS is verified: `https://chores.utilibre.org` → the separate Caddy edge → `10.10.1.43:3215`. The initial private transport checks below were followed by actual public HTTPS/OIDC/MFA checks on 2026-10-09. No request interception or private-origin substitution was used in the public pass.

## Revisions and maintenance

Backend v0.1.80 (`e88d8bea62405ca02288f93dd70efab8c0f1ff2c`), frontend v1.2.55 (`19c6a13dbfcfb7bc3110688554a45e29472a17b1`). Both upstream projects describe the licence as AGPLv3 and include AGPL version 3. Current runtime `utilibre-donetick:0.1.80-p3`, image `sha256:1d9860d039030b43c93c7191c67fbfdc16262e8aac47f99fcbddb8b7095e1942`. The earlier activation and restore checks used p1; the later focused maintenance is recorded below.

Primary review: [backend release](https://github.com/donetick/donetick/releases/tag/v0.1.80), [frontend release](https://github.com/donetick/frontend/releases/tag/v1.2.55), [upstream advisories](https://github.com/donetick/donetick/security/advisories). The published weak-JWT advisory GHSA-hjjg-vw4j-986x affects versions through 0.1.43 and was fixed in 0.1.44; this release is newer and this installation uses a freshly generated private JWT secret.

Reproducible patches remove unused OpenTelemetry instrumentation and optional tracking/voice interfaces, omit OAuth codes from error logs, handle failed userinfo responses, use cryptographic OAuth state, canonicalize asset paths before authorization, avoid extensionless filename panics, sanitize stored rich-text HTML at native rendering/editing sinks, and replace inaccurate native privacy/terms text with existing localized portal links. Compatible dependency updates are frozen in the two lockfiles. See `backend.patch`, `frontend.patch`, added focused tests and `rebuild.sh`. A private, unsent upstream report records the authorization issue; no external report was submitted.

Go 1.27.2 and govulncheck 1.8.0: final result has three advisory IDs in uncalled dependency packages and zero vulnerable function calls. The original 309 findings were repeated traces for 49 unique IDs, not 309 distinct vulnerabilities. Final frontend npm audit reports 11 package entries propagating from three advisory groups: build-only braces and postcss-selector-parser, plus a low-severity Quill HTML-export advisory. Native code does not use Quill's HTML-export API; DOMPurify 3.4.16 sanitizes every stored-description render/edit sink, with a fictional browser regression. This is not a claim that the lockfile contains no advisories.

## Account, storage and privacy facts

Native confidential OIDC uses the existing approved-user and verified-email Authentik bindings. Password sign-in and public account creation are disabled; each new account starts in a separate circle (`single_circle_instance: false`). The pinned native OAuth client does not implement PKCE, so this confidential client uses its supported code flow with strong random state. Its only outbound application path is a fixed gateway to Authentik token/userinfo endpoints, with HTTPS certificate verification enabled (chain depth four). No shared identity settings were changed.

Chore text, completion history, circle membership, account identifiers and attachments are readable on the server in SQLite/local storage, not end-to-end encrypted. Circle join codes create requests; an administrator must accept them. Leaving removes normal circle access but cannot remove downloaded copies. Native signed attachment URLs last seven days and work without an account for anyone holding the complete URL. Profile images are public by known path. Uploaded attachments receive a sandbox response policy and private ten-minute browser caching. Public static assets retain one-hour caching. Local storage holds the browser login token; closing the tab does not remove it.

SMTP, FCM, Telegram, Pushover, webhooks, cloud storage, voice recognition, Google/Apple social login and external analytics are not enabled. Application egress is blocked except the fixed identity path. The app has no general Internet route. Authentication still involves the existing public identity service and its infrastructure providers. The public edge/hosting path and retention are described separately in the portal; this isolated test does not establish their log retention.

Native errors can contain identifiers or paths. Local gateway access logging is off; warning/error and container/system/security logs remain. Docker logs rotate by size at 1 MiB × two files per container, not after a fixed number of days. No promise of universal absence of logs is made.

## Limits and native portability

App: 1.5 CPU, 640 MiB, GOMEMLIMIT 450 MiB, 128 PIDs, read-only root, UID 1000, dropped capabilities. Gateway: 0.5 CPU/96 MiB. Native limits: 5 MiB per attachment, 50 MiB per circle storage pool, 128 realtime connections and five per user; 300 requests/minute plus gateway write/login limits. These are configured ceilings, not a measured concurrent-user capacity guarantee. There is no automatic chore retention/expiry setting enabled.

The installed UI and API do **not** implement a general end-user data export/import. Unused frontend backup helper/translation strings do not establish that feature. Keep independent notes of important chores and download attachments you need. This is not an account migration and omits history, membership, permissions and settings. No user export/import was falsely labelled tested.

Native account deletion is under Settings → Account → Delete Account, confirmed with a local password and `DELETE`. An SSO user can first set that confirmation password through Change Password; password sign-in remains disabled. Transfer shared-circle ownership where required and review the native deletion preview. Deleting owned chores affects collaborators. Native account deletion removed the fictional users, their chores and attachments, and invalidated their API sessions; it left empty circle metadata and synchronization counters. Other members' records, copies, issued links until deletion/expiry, and retained backups are separate. Two strictly identified empty fictional circle rows were cleaned after all native fixture deletion; no real data was changed.

## Recovery and results

`backup.py` briefly pauses only this app, copies SQLite plus WAL/SHM/journal, local storage and private configuration, then unpauses it in `finally`. Copies are root-private in `/opt/utilibre/donetick/backups`. The daily timer runs at 04:55 UTC plus up to 15 minutes. **No automatic pruning is configured**; existing backup retention remains unchanged. Backups include readable data and secrets and can retain deleted records. They share this VM and are not proof of off-host disaster recovery.

`check-restore.py` opened a copied snapshot in the same native image with `--network none`, read a fictional authenticated chore, and fetched its fictional signed attachment. SQLite integrity/foreign-key checks passed. The isolated restore was removed afterward; both original snapshots were retained. For rollback, stop only this app, retain the current data/config snapshot, restore a compatible complete snapshot (database and files together), and run the pinned compatible image. Do not roll back a migrated database by changing only an image tag.

Passed on 2026-10-09: two OIDC/MFA logins with separate circles; other-circle read/delete and attachment signing denied; signed/unsigned asset behaviour; native invite request/administrator approval/leave/revocation; stored-HTML sanitization; local-only app resources; native account deletion; networkless restored application. A wrong-circle request returns a generic 500 in this release rather than a useful authorization message, but returned no record and did not delete it. Final live fixture counts: zero users, chores, circles and storage files. The two Authentik fixture identities were retired and their sessions/tokens removed.

Private evidence is under `/opt/utilibre/reports/donetick-20261009/` and is deliberately excluded from the source offer. The source publisher includes clean pinned backend/frontend source, reproducible patches and deployment/tests, not private configuration, user records, credentials, generated binaries or browser states.

## Public activation pass

On 2026-10-09, two distinct disposable approved identities completed the actual public Authentik password/MFA flow and native Donetick callback. Separate circles, denied cross-circle task access/deletion, approved join/leave sharing and signed/unsigned attachment permissions passed over public HTTPS. The edge adds `no-transform` to the existing private ten-minute attachment caching; the check validates the directives rather than assuming one exact header string.

A fictional recurring chore was created through the native API and completed using the native desktop button. Its completed state, attachment and account/privacy controls rendered at 1440×1000 and 390×844. Screenshots were inspected, horizontal overflow was absent, and no page errors, console errors, CSP failures or failed asset responses occurred. Requests stayed on the app and existing identity host.

Both native accounts were deleted using the supported password/check/DELETE flow; old sessions were rejected and the former signed attachment returned404. Only the exact two recorded fictional empty circle rows and their content-free synchronization counters were then removed, after checking all other circle references were empty. The two marked Authentik identities were retired, credentials disabled and sessions/tokens removed. No real accounts, data or other agents' fixtures were changed; no mail was sent. Private public-pass evidence is `/opt/utilibre/reports/donetick-public-20261009/`. That activation pass used image0.1.80-p1 and needed no service restart or new restore rehearsal. Public activation has no remaining edge gate; access remains restricted to approved Utilibre accounts.


## Native wording and account-deletion follow-up

At 12:41 UTC on 9 October, p3 replaced only the application. The gateway has
remained running since 04:31 UTC. The two native `home.firstTask.description`
translations now say:

- EN: “Add a task to get started. It will appear here when it needs you.”
- ES: “Añadí una tarea para empezar. Aparecerá aquí cuando necesite tu atención.”

They no longer advertise disabled voice/scanning capture. Public native
OIDC/password/MFA sign-in with one uniquely marked fictional account verified
the English hint and, after using the actual language settings menu, the Spanish
hint. Both passed at 1440×1000 and 390×844 without horizontal overflow, page or
console errors, failed assets or unexpected request hosts. The upstream Spanish
locale still has English fallbacks elsewhere; this is not a complete translation
fork. The final image embeds the same checked frontend files.

The pre-change backup's strict foreign-key check exposed four orphan refresh
session rows left by the earlier native deletion of our four recorded fictional
accounts. Their exact ownership was established from the existing fixture
records and retained synthetic snapshot before removing only those rows. No real
account/session or unknown data was removed; the original snapshot was retained.
The native deletion service had omitted `user_sessions`, relying on a foreign-key
cascade not enabled on this SQLite connection.

The ten-line maintenance fix includes refresh sessions in the existing deletion
preview and the same deletion transaction, scoped to the account being deleted.
It changes no schema, current-user session, expiry, retention or authentication
provider. The regression failed on the original code with omitted preview
counts, remaining sessions and a foreign-key violation. With the fix, the
storage, user and authentication test packages pass. The test also verifies
that preview changes nothing and another fictional account's active session
remains identical.

On the public p3 service, a refresh cookie worked before deletion. The native
password/preview/DELETE procedure then removed the disposable account and its
refresh sessions. Its old access token and refresh cookie were rejected; no
manual session cleanup was used for that account. Only its strictly identified
empty circle metadata and content-free synchronization counters were cleaned
afterward. Both navigation QA identities were retired in Authentik, with their
credentials, sessions and tokens disabled/removed. A fresh retained backup passed
SQLite integrity/foreign-key checks and private file/configuration extraction.
No new whole-service restore rehearsal was claimed. Evidence is private under
`/opt/utilibre/reports/native-navigation-20261009/`.

Before both scoped app replacements, the ordinary private backup procedure was
used. Earlier images and every snapshot remain available; retention is unchanged.
Because this update has no schema change, reverting its application image does
not require restoring an older database. Preserve current data; do not overwrite
new user work with a pre-change snapshot. The earlier image would reintroduce the
session-deletion omission, so use it only while assessing a regression.

## Scheduled backup confirmation, 9 October at 13:23 UTC

The failed04:56 systemd state predated the p3 native session-deletion correction
and the subsequent successful manual backup. The actual existing backup service
was run again at13:23:41 UTC and completed with exit0. Its new retained snapshot
passed SQLite integrity, foreign-key and file/configuration extraction checks.
No manual failure reset substituted for execution. The timer remains enabled and
active, with unchanged schedule and retention. No application/source change was
needed for this confirmation. Private evidence:
`/opt/utilibre/reports/scheduled-backup-repair-20261009/donetick.json`.
