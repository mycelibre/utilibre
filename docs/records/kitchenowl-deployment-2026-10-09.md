# KitchenOwl deployment — 9 October 2026

## Installed and checked

KitchenOwl v0.7.10, source commit `09aaf5fbd2343fcc10b12e906c63c3764dd38919`, is installed as the separate `utilibre-kitchenowl` project. Upstream source and backend carry GNU AGPL version3 (no separate later-version grant found). Upstream image: `tombursch/kitchenowl:v0.7.10@sha256:bd821a41b8cb27fd7fcf429acd1fc67e9f889485a2cd1193d68c2d804a8e1bef`. The deployed dependency-maintenance image is `utilibre-kitchenowl:0.7.10-p1`, ID `sha256:54224a8b16eadedcd92ab84b512fcd51cc6d22dcc39143b8ecdf08143e90dd5e`.

The small layered Dockerfile updates multidict, urllib3, PyJWT, cryptography, Werkzeug, nltk, litellm and pip to explicit fixed versions after inspecting installed dependencies/current advisory records. It changes no application feature or database schema. Remaining NLTK advisory PYSEC-2026-3740 concerns caller-controlled model-artifact paths/training APIs; those APIs are not exposed as a service feature here. Recipe scraping/AI are disabled and no user model files are accepted. This is not a claim of zero advisories in every image layer. Private dependency inventory/audit reports are under `/opt/utilibre/reports/kitchenowl-20261009`.

## Access and privacy

- Host `https://kitchen.utilibre.org`, private edge gateway `10.10.1.43:3202`; actual public HTTPS and native OIDC were tested successfully.
- Native OIDC reuses Utilibre's approved/verified-account policy, requesting only openid/profile/email. Password login, onboarding, and open registration are disabled before exposure. First OIDC users are ordinary users, not server administrators. Native server management remains available through upstream `manage.py`; promoting the actual operator's future linked account is a distinct native administrative step, not an automatic first-visitor privilege.
- SQLite stores accounts, household membership, lists, recipes, planned meals, expenses and tokens. Uploaded images are stored in `/data/upload`; this is server processing, not end-to-end encryption. Household-level spending/usage views are application features for the household, not portal visitor analytics. Prometheus metrics collection is disabled. No advertising or cross-service profiling was added.
- Household members can share household content. Some household profile fields (name, description/link/photo) are returned by the native API to another authenticated user who requests that household's ID; do not describe all household metadata as private. Native sharing/publication features need their own visibility review before being described as private.
- Recipe URL scraping, external AI, MCP and metrics endpoints are unavailable here. Manual recipes/lists and JSON import/export work. The only allowed application network destination is the existing HTTPS identity edge. Native Flutter assets/fonts/CanvasKit load from the same host; CSP blocks other browser network destinations. The imported LiteLLM library is explicitly told to use its local model-cost map; no AI key/provider is configured.
- 768 MiB/1.5CPU for the app, 96 MiB/0.5CPU for its gateway; read-only roots, no added capabilities, bounded processes/tmpfs. One upstream uWSGI worker has100 async slots; this is not a measured simultaneous-user capacity promise. Gateway protects writes with30/minute and burst30, body limit1100KiB. WebSocket upgrades are preserved.
- No gateway/uWSGI request-access logging; startup and error/warning diagnostics still exist. Docker rotation is2×1MiB per container, a size bound rather than a time guarantee. Noindex/nofollow applies to the app, not the portal. Dynamic data is private/no-store; ordinary static assets retain a one-hour cache. Existing edge/Cloudflare/provider notes apply independently.

## Native export/deletion guide facts (EN)

In Settings, open the household's settings, then **Danger zone → Export**. This creates `<household>_export.json`. The UI's **Import** accepts JSON and lets you select which supported content to import. Use a compatible KitchenOwl installation and an appropriate target household.

The JSON includes household name/language/feature flags/view order, member usernames, shopping-list names, recipes with ingredients/tags/times, items/categories, and expenses. It is not a complete account/database backup: no passwords, OIDC links, sessions, permissions, full meal-planner history, shopping-list item/check states, or embedded image bytes are promised. Photo fields are references/filenames, not independent image copies. Import handles items, recipes, expenses and shopping-list names; it does not recreate every exported setting or membership. Protect downloaded files. Our fictional-data round trip checked an item/category and recipe/ingredients in a second household; image/expense migration and other clients were not tested.

Use the household's **Danger zone → Delete household** to remove that household for its members. Deleting your account is a separate native profile action; it does not revoke the Utilibre identity account or erase other members' retained/shared copies. The source unlinks retained shared records instead of claiming every record disappears. The current test deleted only two fictional households and its fictional app account through native endpoints, then confirmed its access token was rejected. Images were not part of that deletion test; uploaded-file cleanup and remaining backups must not be described as immediate physical erasure.

## Datos para la guía nativa (ES, voseo)

En Configuración, abrí los ajustes del hogar y elegí **Zona de peligro → Exportar**. Se descarga `<hogar>_export.json`. **Importar** acepta JSON y permite elegir el contenido compatible que querés incorporar. Usá una instalación compatible de KitchenOwl y el hogar de destino adecuado.

El JSON incluye nombre, idioma, funciones y orden de vistas del hogar; nombres de usuario de sus miembros; nombres de listas de compras; recetas con ingredientes, etiquetas y tiempos; artículos y categorías; y gastos. No es una copia completa de la cuenta ni de la base de datos: no se promete incluir contraseñas, vínculos OIDC, sesiones, permisos, todo el historial del planificador, artículos marcados de las listas ni los archivos de imagen. Las fotos son referencias o nombres de archivo, no copias independientes. La importación admite artículos, recetas, gastos y nombres de listas; no reconstruye todos los ajustes ni las membresías. Protegé los archivos descargados. La prueba con datos ficticios comprobó un artículo/categoría y una receta con ingredientes en otro hogar; no comprobó la migración de imágenes/gastos ni otros clientes.

Usá **Zona de peligro → Eliminar hogar** para eliminar ese hogar para sus miembros. Eliminar tu cuenta es otra acción nativa del perfil; no revoca tu cuenta de identidad de Utilibre ni borra copias que otras personas conserven. El código desvincula ciertos registros compartidos que permanecen, por lo que no prometemos que desaparezca todo. La prueba eliminó solo dos hogares ficticios y su cuenta de prueba mediante las funciones nativas y comprobó que el token dejó de funcionar. No incluyó imágenes; la limpieza de archivos y las copias de seguridad no equivalen a un borrado físico inmediato.

## Backup/recovery evidence and retention

`backup.py` uses SQLite's consistent backup API, archives uploaded files/private configuration and verifies an isolated copied database with integrity and foreign-key checks plus archive extraction. Daily timer06:05UTC+up to10minutes. No automatic backup expiry is configured; backups stay on the same VM until the operator removes them. They are not off-site and active deletion does not rewrite them. Snapshots refuse to run with less than5GiB free. Files can change independently of the database snapshot; the performed text-only restore does not establish an atomic image/database restore under simultaneous uploads.

`check-oidc.mjs` passed real HTTPS/approved native OIDC and captured no unexpected browser hosts. `check-data.mjs` then created two fictional households, imported fictional item/recipe JSON, exported it natively, imported that export into the second household, verified item/recipe content, checked anonymous export denial, performed the isolated backup check, and deleted both households plus the QA app account. The token was rejected afterwards and a scoped read confirmed the QA account absent. The external Authentik QA identity was not changed. No real user data was read or deleted.

## Portal facts

Suggested ID `kitchenowl`; hostname `https://kitchen.utilibre.org`; native fixed health endpoint `/api/health/8M4F88S8ooi4sMbLBfkkV7ctWwgibW6V` checks application availability, not every feature. Upstream https://github.com/TomBursch/kitchenowl . Source/patch offer must include the pinned base, layered Dockerfile and configuration.

EN: “Plan meals, share grocery lists and keep household recipes with your Utilibre account.” Limit: “Server-stored household data. URL recipe scraping and AI are disabled; enter recipes manually. JSON exports omit image files, sessions and parts of the planning/list state.”

ES: “Planificá comidas, compartí listas de compras y guardá recetas del hogar con tu cuenta de Utilibre.” Límite: “Los datos del hogar se guardan en el servidor. La extracción de recetas desde URL y la IA están desactivadas; ingresá las recetas manualmente. El JSON no incluye archivos de imagen, sesiones ni todo el estado del planificador y las listas.”

## Published corresponding source

The archive `kitchenowl-utilibre.tar.gz` in `/opt/utilibre/toolbox-public` contains the pinned upstream application source, applied local changes, deployment recipes/patches and licence files. It excludes runtime state, private configuration and credentials. The shared source index links to this file through the existing toolbox source-download endpoint.
