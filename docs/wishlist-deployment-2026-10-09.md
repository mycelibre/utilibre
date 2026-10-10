# Wishlist deployment — 9 October 2026

## Installed, secured and verified

Wishlist v0.67.1 (MIT), commit `a5150c73620abb912a802afdcfb51e403230fff3`, is installed at `https://wishlist.utilibre.org`, private edge port3193. Source: https://github.com/cmintey/wishlist . Upstream image `ghcr.io/cmintey/wishlist:v0.67.1@sha256:4b89bfb5b57ffb087c33978d21b09048e5c37f4506326e9ccd2705a0a1d86548`; deployed source build `utilibre-wishlist:0.67.1-p2`, image ID `sha256:14e15c6b3a5ae4d93cf857427ad5d91354dca32cef1d8f15cffce4c8e8046309`.

The current release fixes the project's earlier SSRF, asset traversal, reset and authorization advisories. Installed dependency inspection additionally found sharp0.35.4 and older vulnerable transitive libraries. `security-dependencies.patch` pins sharp0.35.5, refreshes the compatible dependency lock and pins pnpm11.27.1. Remaining reported paths concern trusted Prisma startup configuration/unused MySQL driver, disabled SMTP, and development tooling; this is not a promise that the image contains no advisories. Full private reports are under `/opt/utilibre/reports/wishlist-20261009` and `/opt/utilibre/reports/wishlist-audit*.json`.

Three small, independent source patches are reproducible/removable via `rebuild.sh`:

- `local-icons.patch`: replace ordinary-page Iconify CDN script/API calls with the same locally served assets. `vendor-icons.py` verifies pinned SHA512-integrity npm packages Iconify2.2.0 and Ionicons1.2.7 (both MIT), preserving the native icon chooser. No third-party icon connection is needed.
- `log-privacy.patch`: remove query strings from request error records and redact native OIDC nonce/state/PKCE verifier values from a failure log.
- `native-deletion.patch`: delete lists before deleting a group, and compare the actual list foreign keys when detecting unlinked items. The unmodified release left3 fictional item rows after group deletion. The patched native regression leaves zero. This fixes native cleanup; no new deletion backend was created.

## Runtime and access

Native bootstrap was completed on loopback before enabling the edge listener. A private operator recovery credential is stored outside the repository. Public password signup is closed; native OIDC accepts only approved/verified Utilibre accounts using openid/profile/email. Password login remains for the private operator account; no public sign-up is available. OIDC users are ordinary users. No shared default group is assigned: a new user starts without a group and can create one through the native user/group menu or join an invitation. Group managers can invite and manage members. SMTP is disabled; invitation/password-reset links are copied manually through the native admin/manager controls. No test email was sent.

The application stores profiles, lists, wishes, prices, notes, links, claims, memberships and sessions in SQLite. Local image uploads up to1MiB are allowed. **Image URLs are accessible without signing in, even when the containing list requires an account. Do not upload confidential images.** Public/registry sharing is a deliberate native group/list option; ordinary lists start nonpublic. Shared recipients can keep their own copies.

Product-page extraction is blocked, and the application cannot fetch outside content: enter title/price/link manually or upload an image yourself. Browser CSP permits same-origin assets only. Server egress is limited to the existing identity HTTPS edge; no external product sites, analytics, remote icons, SMTP or AI providers were added. Authentik receives the usual login/profile information. Existing Cloudflare/edge/hosting notes remain applicable independently.

App512MiB/1CPU; gateway96MiB/0.5CPU; read-only roots, no added capabilities, no-new-privileges, bounded processes/tmpfs and1MiB×2 Docker log rotation. Log rotation is a size cap, not a time promise. Gateway has no access log; warning/error/startup diagnostics remain. Dynamic responses and user images are private/no-store at this gateway; immutable application bundles and local icons keep bounded/static caching. Noindex/nofollow and no-referrer apply. Writes are limited to30/minute with burst30, body limit1100KiB. Native SSE remains unbuffered. These ceilings are not a measured multi-user capacity promise.

## Guide copy/facts — EN

Sign in with Utilibre. A first-time user without a group can open the user menu and create a group, or join an invitation from its manager. Create List, give it a name, then Create item. Enter the title and optional price/URL manually; automatic product extraction is unavailable. Upload only images you are comfortable sharing through an unsigned image URL.

This installed release has no native bulk JSON/CSV/account export. The item “Import” flow accepts a product/share URL; it is not an import of an independent database backup. Keep important wish details in an independent file. We do not claim a tested user-facing export/import that the application does not provide.

Owners/managers can manage lists and individual wishes using native controls; a group manager can delete the group. A shared item can belong to more than one list, so removing one list need not remove the shared item elsewhere. Account deletion requires the operator's native Admin → Users delete control. Deleting Wishlist does not revoke your Utilibre identity account. Native deletion of records is distinct from uploaded-file cleanup: files can remain in the upload directory after a containing list/account disappears; request specific image removal through the existing private operator contact. Do not send passwords or session tokens. Old backups remain under the policy below.

## Datos para la guía — ES (voseo)

Iniciá sesión con Utilibre. Si todavía no tenés un grupo, abrí el menú de usuario y creá uno o sumate con una invitación de quien lo administra. Elegí Crear lista, poné un nombre y después Crear artículo. Ingresá el título y, si querés, el precio o enlace manualmente; la extracción automática de productos no está disponible. Subí solo imágenes que aceptés compartir mediante una URL que no exige iniciar sesión.

Esta versión no tiene una exportación masiva nativa de cuenta en JSON o CSV. La función Importar artículo acepta un enlace de producto o compartido; no importa una copia independiente de la base de datos. Conservá los detalles importantes en un archivo propio. No prometemos una exportación/importación para usuarios que la aplicación no ofrece.

Las personas propietarias o administradoras pueden gestionar listas y artículos con las funciones nativas; quien administra el grupo puede eliminarlo. Un artículo compartido puede pertenecer a varias listas: borrar una no necesariamente lo quita de las demás. Para eliminar la cuenta, solicitá que la persona operadora use Administración → Usuarios → eliminar. Borrar Wishlist no revoca tu cuenta de identidad de Utilibre. El borrado de registros es distinto de la limpieza de archivos: las imágenes pueden seguir en la carpeta de cargas después de eliminar una lista o cuenta; pedí la eliminación de una imagen concreta por el contacto privado existente. No envíes contraseñas ni tokens de sesión. Las copias antiguas se conservan según la política indicada abajo.

## Backup, exact verification and remaining limits

SQLite's native backup API plus an archive of uploads/private configuration is scheduled daily05:50UTC+up to10minutes. Each backup is reopened in a disposable directory, checked with SQLite integrity/foreign-key checks and archive extraction. **No automatic backup expiry is configured.** Backups stay on the same VM until an operator removes them; they are not off-site. Live deletion does not alter old backups. Backups refuse to run with less than5GiB free. A text-only verified restore does not prove an atomic database/image snapshot during concurrent uploads.

Native operator bootstrap, closed signup, real public HTTPS OIDC, ordinary-user group/list/item creation, anonymous private-list denial, isolated SQLite restore, group deletion and native admin deletion of the disposable QA account all passed. Repeated script corrections operated only on that named fictional group/account; all its rows were removed. After the native cleanup fix, the group-deletion regression returned zero owned item rows. No real user data or identity-provider state was deleted. The private report files `oidc-result.json`, `data-result.json`, `qa-cleanup.json` and backup `RESTORE-VERIFIED.json` distinguish the performed checks. A later isolated installed-image check passed native upload, direct item/image deletion and reserve/purchase/unclaim with a second fictional member. Group deletion removed its item record but left the image accessible. See [image/claim verification](wishlist-image-claims-2026-10-09.md). Atomic image/database snapshot consistency remains untested.

## Compact catalog facts

ID `wishlist`; account-required server processing; MIT; launch `https://wishlist.utilibre.org`; status probe fixed private `/login` (200 validates login interface, not all functions).

EN: “Organize gift wishes and shared lists with your Utilibre account.” Limitation: “Enter products manually. Uploaded image URLs do not require sign-in; avoid confidential images. No native bulk export is available.”

ES: “Organizá deseos de regalo y listas compartidas con tu cuenta de Utilibre.” Limitación: “Ingresá los productos manualmente. Las URL de imágenes cargadas no exigen iniciar sesión; evitá imágenes confidenciales. No hay exportación masiva nativa.”

## Published corresponding source

The archive `wishlist-utilibre.tar.gz` in `/opt/utilibre/toolbox-public` contains the pinned upstream application source, applied local changes, deployment recipes/patches and licence files. It excludes runtime state, private configuration and credentials. The shared source index links to this file through the existing toolbox source-download endpoint.
