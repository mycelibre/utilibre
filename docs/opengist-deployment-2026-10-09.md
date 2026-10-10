# Opengist deployment — 9 October 2026

Installed unmodified Opengist **1.15.2**, source commit `5afef9ac76d2d69ba11a888bb7a095b1d14e7c9d`, image digest `sha256:7edc91273ee7d10a17406da8a08c803158baaff984c39b789c1313473d068f21`. [Release](https://github.com/thomiceli/opengist/releases/tag/v1.15.2) fixes symbolic-link writes and malformed Git batch handling. No published advisory was listed on the upstream advisory page on the verification date; this is not a guarantee of absence. Project README names AGPL-3.0, while the generic licence text alone does not resolve only/or-later scope. Public ledger should use human **GNU AGPLv3 (version scope unconfirmed)** pending an explicit release grant.

## Access and deployment

`deployment/community/compose.opengist.yaml` runs only this new stack. App: 1 CPU, 512 MiB, 128 PIDs, nonroot, read-only system image; gateway: 0.25 CPU, 64 MiB. State is `/opt/utilibre/community-data/opengist`. Session/MFA secret and OIDC secret are in a private, read-only native secret-file mount. No SSH listener, metrics listener, external search engine, or source patch. Gateway is bound only to **10.10.1.43:3191**. Native request ceiling 10 MiB at gateway; read15/s burst90, write2/s burst30 per trusted client address. These are request/resource limits, not a measured simultaneous-user guarantee. There is no native per-account storage quota in the inspected configuration; approved-account enrollment and disk monitoring matter.

Canonical URL: **https://snippets.utilibre.org**. Cloudflare DNS/proxy and the separate Caddy route are live. Public HTTPS and native OIDC callbacks passed on 9 October. The native release uses its own canonical hostname.

Only existing approved, verified Utilibre identities can authenticate through native OIDC. Local registration/login forms disabled. Provider and application bindings are reproduced by `configure-opengist-oidc.py`; it does not alter existing users or invitation flows. OIDC admin-group claim maps only existing `akadmin`; a nonempty configured admin group prevents first OIDC signup becoming admin. The verified fictional OIDC user was not admin. No production local user/password is retained. Removing an identity's app access does not instantly revoke an already-issued native application session; native account/session cleanup may also be necessary.

Native footer links lead to Utilibre and existing privacy/abuse pages. Gravatar disabled. Minimal OIDC claims omit avatars. Gateway CSP blocks remote images, fonts, frames and connections; user-supplied external Markdown images consequently do not load. Native gist CSP additionally restricts scripts with its own nonce. Browser can still follow a link deliberately. English and upstream Spanish available; upstream Spanish is not fully voseo and no translation fork has been introduced.

## What is stored and how to leave

Snippets and their **Git revision history are stored as plaintext on the server**, alongside account identifiers, email, tokens (hashed), sessions, comments/likes and index data. Private means access-controlled, not end-to-end encrypted. Public snippets are discoverable; unlisted snippets are available to anyone with the link; private snippets are owner-only through normal app access. Operators and infrastructure processing/storage remain involved. Cloudflare HTTP proxy and the existing edge terminate TLS; HTTP Git uses the live public HTTPS route.

Per snippet, **Download ZIP** exports the selected revision's files. ZIP is not a backup of revision history, comments, likes, account settings or permissions. **Git clone** over HTTPS preserves the reachable Git history and files; it does not transfer native app metadata or access policy. Clone, modify, commit and push with a scoped native access token were tested; protect/revoke the token in Settings → Access tokens. Archive/expiry are distinct: archive makes a snippet read-only, while native expiry/delete removes it. Never put secrets into a public/unlisted revision, including a prior revision.

Delete a snippet through its native delete control; delete the account through Settings → Delete account. Fictional snippet deletion, account deletion and token revocation were verified. Other users' existing forks, downloaded copies and backups are separate copies. No fixed live retention is imposed: native expiry choices include never,1h,12h,1d,7d,15d/custom date. No existing user data or retention choices were changed.

Gateway access logging is off. Native application warning/error logs and gateway errors may include IPs, identifiers or paths; Docker rotates each container's output at **2×5 MiB**, a size cap, not a number of days. Upstream edge/security/provider retention remains the separately documented unknown. No visitor analytics, Gravatar, external archive jobs or cross-service tracking added.

## Recovery and verification

`python3 deployment/community/opengist-backup.py` briefly stops only Opengist, archives its complete data and private config, creates checksums, and restores its prior running state in a finally block. Backups remain on the same VM and have **no automatic deletion**. They are not protection against losing the physical server. Restore private configuration and full data into an isolated directory first; preserve UID1000 ownership, then use the pinned image. Native generated `symlinks/config.yml` and `symlinks/opengist` are recreated by startup; the restore check deliberately excludes these absolute symlinks when extracting into its isolated directory. Keep secrets out of public source archives.

Verified with fictional records only:

- native API create/edit, public/unlisted anonymous read, private404, multiple revisions and ZIP contents;
- native authenticated HTTP Git clone, independent local checkout, commit and push;
- checksum verification, SQLite integrity and **native app reopening all three snippets and their Git history in a network-isolated restored container**;
- native Authentik password+MFA/OIDC signup, non-admin role, footer link and browser requests restricted to Utilibre hosts, first using a private gateway intercept, then repeated through real public HTTPS;
- native deletion of all three snippets and both disposable native accounts; their tokens revoked.

Private evidence: `/opt/utilibre/reports/new-services-20261009/opengist-*.json`. Tested snapshot `/opt/utilibre/community-backups/opengist-20261009T001550Z`. The check scripts create disposable data; do not point them at real accounts. Public TLS/OIDC callback verification passed. Backup scheduling integration is recorded with the new-services batch.

Daily backup scheduling is now installed: `utilibre-community-backup.timer`, around 04:25 UTC with up to 15 minutes randomized delay. Its first run passed after fixture cleanup. Copies remain on the same VM, have no configured automatic expiry, and do not survive loss of that physical server.

Public deployment follow-up, 9 October: the canonical HTTPS route now returns 200 and native OIDC browser checks passed through the real public edge. The earlier intercepted transport was the pre-edge test. The newly recreated synthetic application identity was removed afterward; see `native-public-cleanup.json`. No real accounts were changed.
