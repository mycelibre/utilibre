# linkding deployment — 9 October 2026

Installed unmodified **linkding1.47.0**, source `24b5ad6cc9bde497b5d1b1e86aed5a2fb7d25c2f`, image `sha256:e35cb50e0581178f245125ffaa909c565416c94c9f22ace305a7d234a4345522`, **MIT**. [Release](https://github.com/sissbruecker/linkding/releases/tag/v1.47.0) adds SSRF protections; allow-internal-hosts remains unset and no outbound proxy bypass is configured. The basic image avoids the optional browser/SingleFile subsystem.

`compose.linkding.yaml` adds only this isolated stack, private **10.10.1.43:3194**, canonical **https://bookmarks.utilibre.org**. The public edge route and native OIDC callback are live and verified. App uses 1CPU/512MiB/128PIDs, gateway0.25CPU/64MiB; both nonroot, read-only images, bounded tmpfs and2×5MiB Docker log rotation. Native uWSGI has2processes×2threads within the CPU/memory ceiling.10MiB request limit,60s request timeout; gateway reads15/s burst90 and writes2/s burst30. These are configured limits, not a measured user-capacity result.

## Access and privacy

Native OIDC uses existing approved/verified Utilibre account policies, with exact callback `/oidc/callback/`, verified TLS and PKCE. Local app and Django-admin password authentication are disabled via the documented custom-settings hook. The verified operator's native admin record has an unusable local password and is associated by the verified `admin@utilibre.org` OIDC claim. No existing account was changed. Public registration/auth-proxy headers are not enabled. Private bookmarks are the default. A user can explicitly enable native shared/public bookmark views; shared bookmarks are ordinary server-readable data, not encrypted secrets. No new visitor analytics were added.

Native configuration disables **all background tasks**, favicon refresh, favicon provider, HTML/PDF snapshot features and asset upload. Even enabling the corresponding profile toggles cannot schedule favicon/archive jobs while that global setting is disabled; this was checked. Native profile controls may still show unavailable options; the guide must explain that they have no effect here. No Google favicon or Internet Archive requests are made by these disabled jobs. Link prefetch is false. Server-side title/description lookup remains a native requested function when saving/fetching a URL: the destination sees the server request, and returned metadata may be stored. API callers can use `?disable_scraping=true` to avoid metadata lookup. External destination links still open when deliberately followed.

The native Settings page checks the fixed upstream GitHub release endpoint, cached for an hour; this is a server-side update check, not a browser visitor counter. Error/security logs may contain URLs or identifiers. Normal request logs are disabled by native configuration, but4xx/5xx remain logged; Docker uses **size-based** rotation, not a retention period. Cloudflare/edge/provider retention is the existing separately documented unknown. Gateway CSP blocks third-party browser images/fonts/scripts/connections. The native app has no supported custom portal navigation link in the inspected settings; no navigation patch or forced redirect was added.

## Export, deletion and recovery

Stored data: URLs, titles, descriptions, notes, tags, timestamps, read/archive/share state, account/profile settings, tokens and sessions. Data is plaintext server-side. Native **Settings → Export** downloads Netscape bookmark HTML. This release includes notes in linkding markers, tags, archived/unread/shared flags and timestamps. **Settings → Import** reads that HTML into a compatible linkding instance. Browser bookmark importers may ignore linkding-specific fields. The export does not include account settings/passwords/API tokens, custom bundles, attachments, cached preview images or a full database. Protect the downloaded copy. Public sharing has a separate import option; do not accidentally enable sharing when moving data.

Native bookmark delete and token revocation are available. Account deletion is an operator action through native Django admin; contact the existing private support channel. There is no promised self-service account-delete button. Downloads, other people's saved copies and backups remain separate. No fixed active retention or automatic backup deletion is imposed.

`python3 deployment/community/linkding-backup.py` stops only linkding, copies complete data/private configuration with checksums, and restores the prior running state even on failure. Snapshot files are private, on the same VM, with **no automatic deletion**. Restore a copy to an isolated directory, preserve UID33 ownership, and reopen using the pinned image before any production restore. An on-VM backup does not survive loss of the physical server.

Verified with fictional records: native API create, anonymous API denial; native HTML export/import preserving URL/title/notes/tags/archived/unread flags; disabled archive/favicon scheduling; native MFA-backed OIDC and Settings browser flow through a test-only canonical-host intercept to the private gateway; no third-party browser requests; checksums/SQLite integrity and **network-isolated restored app health and ORM reopening both original/imported bookmarks**. All test bookmarks, three synthetic native accounts and their API tokens were removed through native APIs/models. Private evidence is under `/opt/utilibre/reports/new-services-20261009/linkding-*`; tested snapshot `linkding-20261009T002547Z`.

Public HTTPS and the native OIDC callback passed on 9 October. Configuration and OIDC records are reproducible through the scoped files; upstream code is unmodified. Backup scheduling is integrated with the new-services batch.

Daily backup scheduling is now installed: `utilibre-community-backup.timer`, around 04:25 UTC with up to 15 minutes randomized delay. Its first run passed after fixture cleanup. Copies remain on the same VM, have no configured automatic expiry, and do not survive loss of that physical server.

Public deployment follow-up, 9 October: the canonical HTTPS route now returns 200 and native OIDC browser checks passed through the real public edge. The earlier intercepted transport was the pre-edge test. The newly recreated synthetic application identity was removed afterward; see `native-public-cleanup.json`. No real accounts were changed.


## Full public workflow follow-up

On 9 October 2026, `check-linkding-public.mjs` completed the full native workflow
against `https://bookmarks.utilibre.org`, without request interception, host
overrides or TLS bypass. One distinct fictional identity followed normal
Authentik username/password, MFA and native OIDC. The native Add bookmark form
saved an owned public Utilibre URL with a fictional title, description, two tags,
notes and unread state. Metadata lookup contacted that deliberately supplied
Utilibre destination; no private or third-party content was used.

Native Settings → Export downloaded Netscape HTML. The bookmark was removed with
Remove → Confirm, then Settings → Import restored the downloaded file with
public-sharing import left off. Native API reads of this account confirmed the
exact URL/title/description/notes/tags and unread/private flags. The imported
bookmark survived a normal page reload and was deleted again through the native
confirmation controls. This public pass does not add an archived-flag or
attachment migration claim to the earlier separate checks.

Screenshots at 1280 and 390 CSS pixels were visually inspected; there was no
horizontal overflow, page exception or third-party browser request. Native
controls remain English. The first checker attempt waited for an API path
without its native trailing slash; after correcting that response matcher, the
complete check passed. No application fix or configuration change was needed.

`linkding-public-identity-qa.py` provisions and retires only its explicitly
marked fictional identity using the existing fixture convention; it changes no
shared provider/group policy. `cleanup-linkding-public.py` verifies the exact
empty, non-admin native account before deleting it, then disables the matching
identity and revokes its credentials, MFA and sessions. A read-only request with
the old native browser session returned 401 after cleanup. Both bookmark copies
were already removed through the public UI. No real bookmark/account, backup,
retention setting, container or network was changed; the existing restore was
not rerun. Private evidence is `/opt/utilibre/reports/linkding-public-20261009/`.
