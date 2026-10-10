# La Suite Projects on Utilibre

Pinned main revision `455aa274b44e63efa42840997ea4924b43eed533`, package 1.3.0, local image `utilibre-projects:455aa274-p2`. This is not a tagged 1.3.0 release or restricted PLANKA2. The root npm licence field declares `AGPL-3.0`, normalized to `AGPL-3.0-only` in Utilibre's inventory. Preserve upstream GNU AGPLv3 text and all component notices; no grant was changed.

## Rebuild and configuration

1. Rebuild the pinned server/base using `../evaluation/projects/rebuild.sh`, its Dockerfile and readable `security-dependencies.patch`. That recipe also preserves the upstream patch-package fixes.
2. Run `build-ui.sh`. It extracts the pinned source, applies the existing dependency patch and `native-login.patch`, compiles the native React application in bounded temporary memory storage, then copies its normal build into the base image. The label patch replaces only the unrelated ProConnect button with native HTML using the existing OIDC handler. No browser bundle substitution is deployed. The existing pilot image remains available for rollback.
3. After an identity backup, run `configure-oidc.py` inside the existing Authentik `ak shell`. Only this application's OAuth client, app and bindings are changed. Keep the generated secret private. Strict callback: `https://projects.utilibre.org/oidc-callback`.
4. Privately match the existing operator identity against its verified identity configuration; write only that verified email to `/opt/utilibre/projects/private/operator.json`. Never substitute a contact address or create an operator identity from an assumption. `initialize.py` creates new configuration only and refuses to overwrite existing settings.
5. Native `OIDC_ENFORCED=true`, `OIDC_IGNORE_USERNAME=true` and `OIDC_IGNORE_ROLES=true` preserve subject/email identity mapping without imposing the app's incompatible 16-character username syntax. The two existing approved/verified-email policies govern entry. New app accounts are not administrators; the previously verified owner email is the one native bootstrap administrator. Approved accounts can create projects.
6. Install the firewall/app/backup units. The gateway binds only VM-private and loopback3217. Networks148/149, database-only internal network, edge-only identity HTTPS egress. `Caddyfile.snippet` is the exact separate-edge block. The application can be tested privately before this external step.

SMTP, S3, webhooks, external feedback widgets and the statistics API token are unset. Native `THEME.feedback` supplies the bilingual portal link without injecting UI. Browser CSP blocks external Markdown images and frames. Native sessions still record IP/user-agent metadata; server-readable board data is not end-to-end encrypted.

## Fictional verification

The namespaced QA helpers create two approved accounts and one unapproved identity only, with private credentials. After setup, `check-browser.mjs` exercises real Authentik MFA/OIDC using a loopback TLS harness for the canonical Projects hostname. `check-native.py` creates the fictional boards/cards/tasks/comments/attachments and verifies bidirectional read/write/download boundaries. `check-ui.mjs` downloads the actual native CSV in desktop English and 390px Spanish-locale contexts and verifies exact included/omitted fields. Native Spanish coverage is partial; CSV headings remain English.

The scripts use `/opt/utilibre/reports/projects-launch-20261009` for reports and a disposable locally generated certificate. They never send email or export a real user's data. Unapproved identity rejection, no elevated app role, external-image CSP denials, explicit file deletion, project archival and logout revocation were checked. CSP-attempt events are distinguished from actual network responses.

`cleanup-native.py` removes only the recorded fictional active attachments/projects and revokes their native tokens. `retire-native.cjs`, run on stdin inside the app container, calls the upstream account-deletion helper for exactly the two QA emails and removes only their sessions. It does not purge archived records or invent a physical-erasure guarantee. `retire-qa.py` separately retires those three namespaced Authentik identities.

Public-edge verification now uses `check-public.mjs` with a separate `public1009` fixture namespace and private directory. It connects to the real HTTPS origins, exercises desktop/mobile CSV and native viewer sharing, and removes its own projects/files/tokens. Both retirement helpers accept the validated `UTILIBRE_PROJECTS_CHECK_RUN` suffix to retire only that run's synthetic identities. Do not rerun a retired fixture namespace or restore an earlier identity snapshot over later work. Public results and remaining native limitations are recorded in the dated deployment document.

## Backup and recovery

`backup.py` briefly stops only the Projects application, takes a native PostgreSQL custom-format dump, archives uploads/private settings/this deployment recipe, records SHA256, and restores the prior running state even on error. Daily06:40UTC plus up to10minutes; no automatic expiry. Below5GiB free it defers without deleting older backups. The database remains running during the dump. The timer is enabled only after successful initial recovery.

`check-restore.py` restores a saved dump into a disposable database in the existing DB container and extracts the file archive into a separate private temporary directory. It compares six table counts, the two fictional card contents and both attachment byte strings, then removes only that disposable state. This is tested native database/file recovery, not CSV import or a physical-host disaster-recovery exercise. Same-VM backups do not protect against loss of the physical server.

For a real rollback, stop only this app, preserve its current state and choose a compatible image/database pair. Do not restore a pre-test or pre-upgrade database over later user work without separate authorization. Restore private settings and matching uploads together. The pilot image is a preserved pre-launch fallback, not permission to downgrade live user state.
