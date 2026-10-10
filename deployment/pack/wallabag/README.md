# Wallabag repair and deployment — 9 October 2026

Backend deployed on `10.10.1.43:3177`; public `https://wallabag.utilibre.org` still
returns Cloudflare 525 pending the separate Caddy VM's route. Do not advertise a
working public service until that route and real HTTPS login/assets pass.

## Exact package and security scope

- Upstream: <https://github.com/wallabag/wallabag/tree/496db5b457755bbf7d46f314716c8aad1b80fcfb>,
  unreleased 2.7-dev, MIT. This is **not** a new supported upstream release.
- PHP-FPM image `utilibre-wallabag:496db5b-p1`, immutable ID
  `sha256:377062036d58e98a69df2de531499219703a7b0129d51077cbd56e4a42040c7a`.
- Static web image `utilibre-wallabag-web:496db5b-p1`, immutable ID
  `sha256:720a834f7b667a528d25af60cbcd0603e7d8ebede04d839cced2fecb87858f12`.
  Compose additionally mounts the reviewed `nginx.conf` read-only; that file is
  part of the release, not an optional override.
- Alpine 3.24 / PHP 8.4.26; Nginx unprivileged 1.28; existing Squid 7.7 image
  `sha256:9bc66d80e90a72c29ba89d44447b58bd1faded54b4ecba35b4f7b2b23497c780`.
  Full base digests are in the Dockerfile/Compose. PHP packages are captured by
  the built image ID; rebuilding against Alpine repositories may update them
  and requires new checks and image pins.
- OTPHP 10.0.3 retains the API used by native Scheb 5 MFA. The two-file patch
  backports input validation from [upstream 11.4.3](https://github.com/Spomky-Labs/otphp/releases/tag/11.4.3).
  It fixes GHSA-2jx3-65f3-xr8r and GHSA-g7m4-839x-ch6v without changing OTP
  comparison/generation, falsifying package versions, or disabling MFA.
- Composer still reports two version-based advisories: both matched to verified
  patched file hashes and 14 behavioral cases; zero unexpected runtime findings
  at the dated audit. Sixteen abandoned packages remain. Full frontend build
  tooling has one braces/Stylelint advisory (GHSA-vfj7-8cjw-p6xm); the audited
  browser-runtime dependency set has none. Do not claim a universally clean
  dependency tree or turn this into unattended moving-tag updates.

## Small patches and supported mechanisms

`app-hardening.patch` removes the Sentry bundle/configuration, Matomo rendering
hook and Codecov/notifier build integrations. It enables native MFA CSRF
protection and its documented hidden input, verifies outbound TLS, suppresses
request/error logging, disables public sharing/thumbnails, and uses Symfony's
native progress callback to bound article downloads. It pins the existing
Annotator source and repairs the build lock. `otphp-10-security.patch` is the
separate hash-gated security backport. `custom.css` uses the upstream hook to
hide blocked media placeholders; CSP is the actual network restriction.

No custom authentication, image proxy, synchronization or fetching engine was
introduced. API/OAuth, RSS exports, public sharing, registration, cached article
images and global settings UI are denied at the gateway. Browser reading only;
do not recommend untested native/API clients. Personal export and deletion remain
native. The operator changes global privacy settings through reviewed deployment
configuration, not the blocked global settings screen.

## Data, logs and bounds

The server fetches requested articles and can read their URLs, text, annotations
and saved state. This is **not end-to-end encrypted**. Browser article media and
frames are blocked; image downloading, analytics, remote error reporting and
request logging are off. Exported files can contain original source URLs/content;
another reader may behave differently. App, gateway and proxy container logs use
the `none` driver; the unit discards application output. Native account/session/
library state exists to provide the user's requested feature, not analytics.

No third-party browser HTTP response was observed during the tested clean-profile
login/read/save/export journeys. Requested article retrieval and public DNS
resolution necessarily contact outside infrastructure from the server. No visitor
IP is forwarded into the app or article request. Provider internal retention and
the separate edge's actual configuration remain distinct from these app checks.

- New accounts: operator provisioned only; no registration or shared public account.
  Owner username `admin`, email `admin@utilibre.org`; root-only credentials in
  `/opt/utilibre/pack-secrets/wallabag-owner.json`. Never paste them into reports.
- Persistent SQLite state: `/opt/utilibre/pack-data/wallabag`; UID/GID 4007.
  Libraries persist until native deletion. No automatic archive-retention policy
  or per-user disk quota is claimed. Registration stays closed while capacity
  and supported account provisioning are managed by the operator.
- PHP: two workers, 192 MiB per request, 20-second execution / 25-second worker
  termination. App container 384 MiB / 0.75 CPU; proxy 192 MiB / 0.5 CPU; gateway
  64 MiB / 0.25 CPU. These are ceilings, not concurrency promises.
- Native fetch: 2 MiB article download, 15 seconds, five redirects; proxy only
  public TCP 80/443. IPv6 is disabled for this reader's egress. HTTP request/upload
  maximum 2 MiB; aggregate fetch/import limit six/minute with burst two. Native
  authentication POST limit thirty/minute with burst five. Limiters store an
  application-wide bucket, not IP/UA histories. A 429 means wait before retrying.
- Only DNS and existing SMTP `10.10.1.20:26` are allowed directly from PHP;
  SMTP greeting tested, new email delivery not tested. Caddy alone may reach
  the private 3177 listener. Loopback 33177 is for operator checks.
- Post-test sample: app 94.93 MiB, gateway 2.355 MiB, proxy 9.699 MiB, each 0%
  sampled CPU. It is not a load/capacity benchmark. Host free disk was about
  6.6 GiB after removing only the two generated build dependency directories;
  those can be recreated with the reviewed lockfile. No user data was removed.

## Build, run and rollback

Run from the repository root. `node deployment/pack/wallabag/build.mjs` builds
from the pinned checkout plus patches in a fresh private directory, not live
data. It needs development/build dependencies and more disk than the runtime.
Do not repeatedly rerun it on a nearly full VM. Check new image IDs and update
Compose pins deliberately. `node deployment/pack/wallabag/check-candidate.mjs`
rechecks the source lock, backport and regressions; it does not authorize release.

First setup uses `prepare.mjs` (exclusive secret creation) and `bootstrap.php`
(native installer with in-memory answers). Both refuse existing state; neither
is an upgrade or reset mechanism. Never use upstream default passwords. The
production install is already complete: **do not bootstrap it again**.

Normal startup, after checks:

```sh
sh deployment/pack/wallabag/firewall.sh
docker compose -f deployment/pack/wallabag/compose.yaml -f deployment/pack/wallabag/compose.edge.yaml up -d
systemctl restart utilibre-wallabag.service
```

The installed unit is enabled and reapplies its scoped firewall before startup.
It supervises the three containers together; Docker auto-restarts are off so a
host reboot cannot start them before the network restrictions. Health checks hit
the native login page; they are not a task-success or public-TLS test.

For a private rehearsal, omit the edge override and use `compose.local-check.yaml`
so upstream absolute asset URLs point to loopback. Never combine that override
with the edge deployment. Restore production origin before public use.

Rollback: `systemctl disable --now utilibre-wallabag.service`. Remove/disable
only this hostname's Caddy block if it has been added. Preserve the SQLite
directory, secret files, encryption key and completed backups. The former stable
2.6.14 image has known advisories: do **not** roll back to it as a public service.
This is a new installation, so safe rollback is withdrawal, not database deletion.

## Verification and recovery

37 native functional tests / 175 assertions, a separate nine-assertion MFA/CSRF
test, and 14 OTP/security cases passed. Final production-image Linux Chromium
checks passed MFA, two-account/anonymous isolation, real owned-page saving,
JSON/TXT/PDF/EPUB exports, blocked media, secure cookies behind HTTPS headers,
aggregate rate limiting and mobile layout. No outside browser HTTP responses,
broken runtime assets or script errors were observed. Physical Windows/Opera,
public TLS, third-party clients and hostile public redirects were not tested.

Nineteen network-boundary cases passed. Oversize HTTPS rejection transferred zero
body bytes. Evidence is retained under `/tmp/utilibre-wallabag-production-3V33Ng/`
and the dependency report named in `docs/service-pack.md`; a fresh test date does
not establish uptime history. Test accounts/articles were removed after checks.

`snapshot.php` uses native SQLite `VACUUM INTO`, streamed through existing
OpenSSL CMS AES-256-GCM encryption. It participates in `utilibre-pack-backup.timer`.
The pack's private-config archive includes secrets and deployment configuration;
its decryption key remains separate but on this VM. Local snapshots are **not**
off-host disaster recovery. Existing pack retention has no automatic deletion:
deleted articles may remain in older encrypted backups until those generations
are retired under an owner-approved policy.

The synthetic snapshot `wallabag-backups/2026-10-09T19-28-58-121Z` passed native
password+MFA login, article read and JSON export after decryption into a disposable
networkless container. The restore script needs the root-private synthetic
fixture manifest, retained separately; it never writes over live data. The fresh
pack snapshot after fixture cleanup also includes the owner account and secrets.
Subsequent generic pack checks verify encrypted SQLite integrity/account presence;
that does not silently renew the dated functional-restore claim.

## Starter copy for the account-service launch

Publish only after the public route works, alongside the actual approved-account
onboarding. This is finished tested copy, not a promise of public registration.

### English: Save an article for later

You need an operator-provided Wallabag account. Open
[Wallabag](https://wallabag.utilibre.org/login), sign in and enter your authenticator
code if enabled. Select **Add a new entry**, paste a public article URL, then
submit it. To try it without personal information, save
`https://utilibre.org/en/`. Open **Unread** and select the saved article. Check
that the text is present; a saved title alone does not mean extraction succeeded.

Use the article's export controls to download JSON for portability, or TXT, PDF
or EPUB for reading. Reopen the downloaded file. Use the native delete control
when you no longer need the saved copy. To read a feed item later without a
Wallabag account, keep using FreshRSS's native favourites. Moving a URL from
FreshRSS to Wallabag is a manual copy/paste, not synchronization.

Utilibre's server retrieves the page and stores a private account library that
operators can access. It is text-first: images/video are not shown. Some websites
refuse extraction, require login or exceed the two-MiB fetch limit; open the
original deliberately if needed. Wait after a 429 error. Deleting your copy
does not erase older backups or files you downloaded. Keep exports private.

### Español: Guardá un artículo para después

Necesitás una cuenta de Wallabag habilitada por la administración. Abrí
[Wallabag](https://wallabag.utilibre.org/login), iniciá sesión e ingresá el código
de tu autenticador si lo activaste. Elegí **Add a new entry** si la interfaz está
en inglés, pegá la dirección de un artículo público y enviála. Para practicar
sin datos personales, guardá `https://utilibre.org/en/`. Abrí **Unread** y elegí
el artículo guardado. Comprobá que aparezca el texto: guardar el título no prueba
que la extracción haya funcionado.

Usá los controles de exportación del artículo para descargar JSON como copia
portable, o TXT, PDF o EPUB para leer. Volvé a abrir el archivo descargado. Usá
el control de eliminación cuando ya no necesités esa copia. Si no tenés cuenta
de Wallabag, podés seguir usando los favoritos nativos de FreshRSS. Pasar una
dirección de FreshRSS a Wallabag es copiar y pegar, no sincronización.

El servidor de Utilibre obtiene la página y guarda una biblioteca privada de tu
cuenta que la administración puede leer. La lectura es de texto: no se muestran
imágenes ni videos. Algunos sitios rechazan la extracción, piden iniciar sesión
o superan el límite de dos MiB; abrí el original de forma consciente si lo necesitás.
Si aparece un error 429, esperá antes de reintentar. Eliminar tu copia no borra
respaldos anteriores ni archivos que descargaste. Mantené tus exportaciones privadas.
