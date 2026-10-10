# Links from hosted applications to Utilibre

Reviewed 8–9 October 2026. Direct visitors should be able to discover the catalog through an ordinary optional link. Links have no referral parameters, tracking script or redirect gate. Preserve each application's name, upstream attribution and the user's current work. Use supported application configuration; do not inject HTML into proxied responses or create a source fork for a promotional link.

| Application | Supported setting / observed navigation | Result |
| --- | --- | --- |
| PrivateBin | `[main] info` in `deployment/utilibre/config/privatebin/conf.php` | Live English **More tools from Utilibre** and Spanish **Más herramientas de Utilibre** links to `/en/` and `/es/`. The existing PrivateBin attribution remains. Public HTTPS response and both anchors verified. |
| RSS-Bridge | `[system] message` in `deployment/community/rssbridge.ini.php`; upstream `lib/html.php` and `templates/base.html.php` render the administrator's configured message | Live bilingual links beside the existing feed/cache limitations. Public HTTPS response and both anchors verified. No restart or cache purge. |
| PairDrop | `CUSTOM_BUTTON_ACTIVE`, `CUSTOM_BUTTON_LINK`, `CUSTOM_BUTTON_TITLE` in `deployment/community/compose.yaml` | The live native custom button links to the catalog as **Más herramientas de Utilibre / More tools from Utilibre**, verified in the native configuration and public browser on 9 October. The change was made only after repeated zero-client checks. |
| JupyterLite | Native JupyterLab Help menu item in `deployment/expanded/jupyter/overrides.json` and its Spanish counterpart | Existing **Back to Utilibre / Volver a Utilibre** links open the appropriate language. No change or rebuild required. |
| Utilibre login / authentik | Native tenant `footer_links`, maintained by `deployment/identity/configure.py` | Existing English and Spanish catalog links in authentication flow footers. No identity/permission change required. |
| Public status / Uptime Kuma | Native status-page `footerText`, maintained by `deployment/community/bootstrap-kuma.mjs` | Existing English and Spanish catalog links. Keep the notice that this monitor shares the application VM. Do not rerun the full bootstrap just to alter link wording. |
| Yopass 14.10.0 | `--privacy-notice-url` is already configured | Its native **Privacy notice** link opens the portal privacy page, whose navigation leads to the catalog. No arbitrary catalog-link option was found in the installed server configuration. Do not misuse **Imprint** for the catalog or enable paid branding to work around this. |
| CryptPad 2026.9.0 | Supported `AppConfig.privacy` and `AppConfig.terms` localization maps in `deployment/pack/cryptpad/application_config.js` | Native policy links already reach the bilingual portal. `hostDescription` is text, and the documented footer slots have fixed meanings; no arbitrary catalog link was added under a misleading label. |
| Rallly 4.15.4 | Native **Control panel → Settings → Footer links** (`features/instance-settings/schema.ts`, `mutations.ts`, `loaders.ts`) | Live EN/ES catalog links through the supported footer field, preserving all three existing links and attribution. The row was updated narrowly with native schema bounds and concurrent-change protection; no user privileges changed. A verified graceful app-only restart refreshed the in-process settings cache. Public login recovery/invite checks pass; see `rallly-navigation-2026-10-09.md`. |
| FreshRSS 1.29.1 | `logo_html` in `config.default.php` | The logo markup is already inside an application-home anchor; inserting another anchor would be invalid navigation. No separate arbitrary-link setting found. Existing application identity preserved. |
| ntfy 2.28.0 | Installed server configuration and web navigation inspected | No supported arbitrary catalog-link option found. No restart, notification-cache loss or UI injection introduced. |
| Other proxy frontends | Their existing native navigation and source notices remain | Not claimed to have a catalog link everywhere. Add one when an upstream-supported option is identified; absence does not justify a new persistent source patch. |
| BentoPDF 2.8.8, checked 10 October | `VITE_BRAND_NAME`, `VITE_BRAND_LOGO`, `VITE_FOOTER_TEXT`; native navbar/footer templates | Branding and text footer only; no arbitrary catalogue/help/privacy link configuration. Preserve identity and existing links, without adding an overlay or source fork. |
| QR Generator Offline 0fde700-p4, checked 10 October | Native fixed footer; existing Utilibre offline-controls adapter | No upstream arbitrary navigation setting. The existing offline-guide link now follows the application's current EN/ES language and returns through portal navigation. No global navigation bar was injected. |

## Apply and recover

PrivateBin and RSS-Bridge read these settings for requests. Repo and active PrivateBin configuration were updated together; RSS-Bridge already mounts the repository setting. Pre-change copies are private under `/opt/utilibre/reports/content-review-20261008/instance-navigation-before/`. Restore only the affected configuration field if rolling back; do not overwrite unrelated operator changes or application data. PairDrop's label was applied through its normal service-specific recreation after repeated zero-client observations. A future label rollback must use the same zero-client gate; do not restart the full stack.

Rallly now preserves its three existing footer links and also includes:

- `More tools from Utilibre` → `https://utilibre.org/en/`
- `Más herramientas de Utilibre` → `https://utilibre.org/es/`

The logged-out login recovery and fictional invitation pages were verified in EN/ES on desktop/mobile. The normal OIDC redirect remains unchanged; Rallly’s streamed login footer still needs JavaScript. See the dated native navigation record for cache refresh and field-only rollback. This setting changes no registration, sharing or indexing permission.

## Installed additions reviewed on 9 October

| Application | Installed source/configuration checked | Result |
| --- | --- | --- |
| Spliit 1.29.0 | `src/lib/env.ts`, `src/app/layout.tsx` | The environment schema has no arbitrary footer/menu URL. Its native footer contains fixed application/upstream links; changing the app base URL would break its own routes. No supported catalog anchor was found. |
| Wishlist 0.67.1 | `src/lib/server/config.ts`, `src/routes/+layout.svelte`, native menus | The complete typed settings map covers accounts, SMTP, groups, lists and OIDC, not arbitrary navigation links. The footer is fixed native UI. No supported anchor was found. |
| linkding 1.47.0 | `bookmarks/settings/base.py`, `bookmarks/templates/shared/nav_menu.html`, native custom-settings hook | The supported settings hook does not supply a menu-link option consumed by the native templates. Custom CSS cannot create a semantic accessible link. No template override or promotional source fork was introduced. |
| Vikunja 2.7.0 | `pkg/modules/auth/openid/openid.go`, `pkg/models/user_settings.go`, `frontend/src/views/user/Settings.vue` | **Implemented:** native `extra_settings_links` supplied by a Vikunja-only Authentik profile mapping adds **More tools from Utilibre** → `/en/` and **Más herramientas de Utilibre** → `/es/` in the authenticated Settings sidebar. It appears after the next full sign-in; existing sessions are not revoked. The logged-out screen remains unchanged. |
| KitchenOwl 0.7.10 | `backend/app/config.py`, `kitchenowl/lib/pages/settings_page.dart` | Native privacy/terms URL settings retain their real legal meanings. The existing privacy link reaches the portal, whose navigation reaches the catalog. No arbitrary catalog-link setting was found; Privacy/Terms are not relabelled as promotional links. |
| ByteStash 1.5.14 | Native environment/configuration parsing, `server/src/config/userSettingsSchema.js`, client navigation | Settings cover theme, locale and snippet presentation, not arbitrary menu links. No supported catalog anchor was found. Existing OIDC/login behaviour was not changed into a forced portal redirect. |
| Radicale 3.8.3 | `radicale/web/internal_data/index.html`, internal web/configuration implementation | Its built-in web UI has fixed collection-management navigation. The optional InfCloud button means collection content, not an arbitrary website. Adding a custom web plugin/interface solely for branding would exceed this change. |
| Calino installed pin | `src/config.ts`, Sidebar, PrivacyPolicy and onboarding components | Repository/contact controls have defined GitHub/email meanings. `websiteUrl` is defined but is not consumed by a rendered navigation anchor in this release. None was repurposed to misrepresent a repository, update source or contact. |
| Razzia 3.1.0 | `docs/branding.md`, native branding model/consumers | Native branding supports application name, colours, fonts and image assets, not arbitrary anchor destinations. No HTML injection was added to those fields. |

The eight unsupported direct anchors are concrete native-feature limits, not waiting configuration changes. Their existing software attribution and legal links remain intact. This review does not claim a catalog anchor appears on every application screen.

### Vikunja apply/recovery and verification

Run `deployment/community/vikunja/configure-catalog-links.py` through the existing Authentik shell. It creates a static mapping for only `Utilibre vikunja`, adds it without replacing existing mappings, and asserts that every concrete provider field is unchanged. It uses the already requested `profile` scope; no additional personal claims, permission grants, redirect URIs, consent rules or sessions change. The provisioning recipe preserves the named mapping when later rerun; for a fresh deployment, run the narrow helper after the ordinary provider provisioner.

Private rollback metadata at `/data/private/vikunja-catalog-links-before.json` records prior mapping IDs and the added mapping ID. To undo, remove only this added mapping from this provider; delete the mapping itself only if unreferenced. Do not restore an identity database or replace unrelated mappings. Existing users receive/remove the static links on their next native sign-in.

Actual public OIDC/password/MFA sign-in with a uniquely marked fictional identity rendered both exact labels and destinations. App requests stayed on the expected task/identity hosts, no JavaScript errors occurred, and no service restart or software rebuild was necessary. The links have no referral parameters or tracking requests. Private evidence is `/opt/utilibre/reports/native-navigation-20261009/`; fixture cleanup and mobile checks are recorded there.
