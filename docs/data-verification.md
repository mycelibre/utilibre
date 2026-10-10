# Native data export and deletion verification — reconciled 9 October 2026

This is the evidence record for `/en/your-data` and `/es/your-data`, not a new
export service. Procedures use installed application controls; Spanish uses
voseo. An application export, a database integrity check and a full restored
user workflow are different checks. The public guide states their actual scope.

Original private test evidence is under
`/opt/utilibre/reports/content-review-20261008/` (operator-only). The 9 October
rows link their dated deployment records, which identify the corresponding
private report locations and pinned source. Evidence includes synthetic
credentials and must not be published or added to source archives. This update
reconciles those existing records; it does not inspect private application data.
Existing recovery evidence is documented in [backups.md](backups.md), including
its private report locations. Only fictional/disposable test data was changed.

## Shared deployment facts

- Core backups retain seven daily generations and four Sunday weekly
  generations. Manual runs count as generations; this is not a guarantee of
  exactly seven or twenty-eight days.
- Account, expanded, community and pack backup sets have no automatic expiry.
  Application deletion does not rewrite old backups. No fixed backup-deletion
  deadline is published for these sets.
- All backup sets are on the VM. Pack archives (including CryptPad/LiberaForms)
  are encrypted with the key outside the archive but on the same VM. Other sets
  are root-restricted archives/dumps without an additional archive encryption
  layer. Application ciphertext inside an archive is a separate property.
- Public HTTPS for the original ten stateful services passes through Cloudflare, confirmed by
  DNS and response headers in private `public-hosts.json`: `rss`, `pad`, `budget`,
  `wakapi`, `poll` (Rallly), `pollaris`, `forms`, `fmd`, `cv` and `design`. This is HTTP proxying,
  not DNS-only. The operator separately confirmed that the application and Caddy
  edge VMs share one physical Hetzner server in Germany. Retention is not inferred
  from that location.
  FMD additionally requests OpenStreetMap tiles in the browser and uses the
  device-selected push endpoint. FreshRSS retrieves the user-selected feed sites.
- [The 9 October provider/endpoint review](privacy.md#provider-policy-and-endpoint-review-9-october-2026)
  verifies actual DNS-only/proxied records and distinguishes recursive DNS,
  STUN, translation and map-provider policy scope. Caddy/Cloudflare HTTP account
  logging, endpoint-specific STUN/map retention and correspondence access/expiry
  remain unverified. Application retention is not extrapolated to those layers.
- No complete off-host disaster recovery or full-host RTO has been demonstrated.
- On 9 October the operator explicitly chose to keep backup schedules and
  retention unchanged while arranging more storage. About 14 GiB of free VM disk
  was reported at that checkpoint; this is an observation, not a reserved quota.
  No backup was deleted or expiration shortened for this review.

## Original stateful-service evidence — 8 October 2026

| Service/version | Processing and retained data | Active retention / backup set | Native export and scope | Import/reopen verification | Deletion and access | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Reactive Resume 6.0.0-p1 | Server-readable resume/letter/application/account data and uploads; new visitor analytics/identifier derivation disabled, earlier aggregate counts may remain | Native Trash/purge/account deletion / expanded, no automatic backup expiry | Account ZIP with account/application JSON and individual resume/letter JSON; image URLs, not image bytes; secrets omitted. Single resume JSON includes hidden/private fields. | 9 Oct exact-image native account ZIP download/CRC and one extracted resume JSON import into a second fictional account passed; content/design, private sharing reset, editable save/reload and source-account denial checked. Whole ZIP gives native extraction guidance; no full account/letter/job/image migration claim. | Native Trash/purge previously tested; Settings Account Your data native account deletion and sharing/key retirement documented. | Pinned `docs/guides/exporting-your-data.mdx`, `exporting-your-resume.mdx`, `importing-resumes.mdx`, `deleting-your-account.mdx`; [native account ZIP check](reactive-resume-account-export-2026-10-09.md); earlier isolation/cleanup harness |
| Penpot 2.18.2 | Server-readable design files/assets/team/account metadata | Native file/account deletion / expanded, no automatic backup expiry | Native .penpot editable file, with explicit shared-library inclusion/merge/detachment choices; visual exports are different. No account/team/history migration promise. | 9 Oct isolated exact-image native .penpot export → import into an independent profile passed for one fictional rectangle/page; name, geometry and fill preserved. Browser edit saved and survived reload; source account denied access. Shared libraries/images/fonts/history/team migration not tested. | Native file API deletion previously passed; file trash/permanent deletion and Profile account controls source-reviewed; transfer shared ownership first. | Pinned `frontend/src/app/main/ui/exports/files.cljs`, `data/exports/files.cljs`, `ui/dashboard/import.cljs`, `ui/settings/profile.cljs`, `delete_account.cljs`; `docs/toolbox-review.md`, [native round trip](penpot-roundtrip-2026-10-09.md) |
| FreshRSS 1.29.1 | Server subscriptions, fetched articles, favourites, labels and reading state | Per-feed/article controls; no invented universal active deadline / core generations | Subscription OPML; separate selected article JSON; ZIP combines selections. OPML is not article/read-state export. | Export OPML from disposable A, import to B, re-export and check known subscription passed. Separately, a 9 October same-VM PostgreSQL dump plus matching-file restore passed native browser login/feed/article listing in 6.1s. Separately, the installed-image 53-article fixture passed JSON/ZIP import fidelity for content, read/unread, favourites and labels. Web feed selection exported50, starred/labels5, combined ZIP52; native operator limit100 included53. See [article export check](freshrss-article-export-2026-10-09.md). | Native Profile account deletion for non-admins; subscription removal; API credential revocation separate. | `app/views/importExport/index.phtml`, `app/Services/ExportService.php`, `app/views/helpers/export/articles.phtml`, `app/views/user/profile.phtml`; private `freshrss-export.py`, `freshrss-export.log`, `freshrss.opml`; [operator restore](backups.md#freshrss-browser-rehearsal-9-october), private `freshrss-browser-restore-9nbye0vn/result.json` |
| CryptPad 2026.9.0 | Browser encryption; server ciphertext plus functional account/storage metadata; browser/link keys | Inactive unretained documents 90 days, archives 15 days, inactive accounts 365 days / encrypted pack, no automatic backup expiry | Settings → CryptDrive → Backup is JSON access keys/drive structure. Download my CryptDrive is contents ZIP with failures reported and format-dependent files. | 9 October isolated native check: personal ZIP includes Markdown, Rich Text HTML and uploaded text file; keys JSON has no bodies. HTML reopened, Markdown imported to independent account and persisted. Personal ZIP excludes the team document; separate owner team ZIP includes it. Native invite acceptance passed. [Evidence](cryptpad-drive-export-2026-10-09.md). Full account/drive migration not claimed. | Removing a drive entry differs from destroying owned content; account deletion can leave documents retained by collaborators. | `www/settings/inner.js`, `www/common/make-backup.js`, `www/common/translations/messages.json`; `deployment/pack/cryptpad/config.js`; `docs/service-pack.md`, `docs/backups.md` |
| Actual 26.10.0 | Budget in local/browser state plus server synchronization files; separate account metadata | User-controlled active budget deletion / expanded, no automatic backup expiry | Native Export data ZIP contains budget database/metadata; downloaded copies are not automatically protected by sync encryption. | Native ZIP export/import into the same 26.10.0 release passed: fictional cash account and 123.45 opening balance. No historical-version or bank-integration migration claim. | Files menu deletion distinguishes local/server copies; operator account/session retirement separate. | Native deployed UI; upstream `backup-restore/restore`; private Actual synthetic report files |
| Wakapi 2.18.1 | Server raw coding heartbeats and derived summaries; intentional user-submitted file/project metadata | Scheduled cleanup of heartbeats, durations and summaries configured 3 months / expanded, no automatic backup expiry | `scripts/download_heartbeats.py`, API raw-heartbeat CSV; no matching UI export button; not preferences/aggregates/aliases | One recent fictional heartbeat A → CSV → native `upload_heartbeats.py` → B passed. Older-data maximum-age admission not tested. pandas 2.3.3 passed; pandas 3 failed upstream uploader. | Stop clients, rotate/revoke API key, native Settings Delete account. Public leaderboard and external importer disabled. | Pinned `scripts/download_heartbeats.py`, `upload_heartbeats.py`, `views/settings.tpl.html`, `deployment/expanded/compose.yaml`; private `wakapi-result.json` (22:35 UTC), CSV and scripts |
| Rallly 4.15.4 | Server poll definitions/options, votes, participants, comments and accounts | Native poll/account deletion / community, no automatic backup expiry | Organizer management → Export to CSV. Names, available emails, response times and option votes; not comments/settings/account/permissions | Native organizer CSV with two fictional participants passed exact columns, timezone/votes and omission checks in an isolated installed image; anonymous management denied. No native full-poll CSV importer or complete migration claimed. See [CSV check](rallly-csv-export-2026-10-09.md) | Organizer Delete; closing a poll is separate. Recipient copies remain. | `features/poll/components/manage-poll.tsx`, `manage-poll/use-csv-exporter.ts`, delete dialog; current 4.15.4 release inspection |
| Pollaris 1.2.3 | Server poll and votes; secret management token; public poll results | Native poll expiration/deletion / community, no automatic backup expiry | Public results CSV, including participant names/votes; not management credentials or complete poll state | Public HTTPS create/vote/CSV contents passed. No result-to-poll importer found. | Wrong management token rejected; native fixture poll/answers deletion passed | `deployment/community/check-pollaris.mjs`; private `pollaris.log`; `templates/polls/show.html.twig` |
| LiberaForms 4.11.1-p5 | Browser-encrypted answers, server-readable form definitions/accounts/permissions | Native answers/form/account deletion / encrypted pack, no automatic backup expiry | Answer table CSV/JSON/PDF; attachments disabled by this instance configuration. Key backup is not answer backup. | Existing synthetic answer JSON, key restore and isolated restored answer decryption. The installed browser export component passed CSV/JSON/PDF reopening with fictional post-decryption table data on 9 October; this is not a new authentication/key test. Uploads remain disabled. See [format check](liberaforms-export-formats-2026-10-09.md). | Authorized editor answers/form deletion, profile account deletion; revocation cannot recall exported plaintext | `views/data_display/data_types/answers.py`, `templates/answers/list-answers.html`, attachment handlers; `docs/service-pack.md`, `docs/backups.md` |
| FMD Server 0.17.0-p2 | Browser/client-encrypted locations and pictures; server account/push metadata | Maximum 300 locations, 5 pictures; count, not time / community, no automatic backup expiry | Settings → Export data ZIP: `locations.csv`, `pictures/*.png`, `info.json` (FMD ID/push URL), decrypted in browser; zero accuracy/altitude/speed/bearing are preserved; missing values remain blank | 2026-10-09: native public browser login, decrypted ZIP download, CRC/local reopening and exact three-location/PNG/metadata fixture passed, including nonzero/zero/absent optional fields. Map tiles were local fixtures. No Android/push or native ZIP import test. | Native browser Delete locations, Delete photos and Delete account passed; old token denied and own account salt404. Retire client/push integration as well. | [Native export check](fmd-export-verification-2026-10-09.md), `deployment/community/check-fmd-export.mjs`; earlier `check-fmd.mjs` isolation; pinned SettingsModal source |

The source files referenced above are the pinned checkouts under
`/opt/utilibre/src/`, `/opt/utilibre/expanded-src/` and
`/opt/utilibre/community-src/`; artifact pins are in the existing catalog and
service manifests. Public guide links point to upstream documentation, while
installation-specific claims use the checked configuration/source above.

## Added applications — verified 9 October 2026

This uses the same record format, with an explicit date in each evidence cell.
**Hosting** below means the existing Cloudflare HTTP proxy, Caddy TLS termination
and Hetzner hosting path, not Cloudflare DNS-only service. No application row
establishes provider/edge retention. **Existing identity** means the installed
Utilibre Authentik OIDC service receiving normal login/profile claims and session
metadata; it is not a new identity provider or visitor-analytics integration.

All new server-state backups listed here run daily, stay on this VM, have no
configured automatic expiry and can retain deleted records. Per-service schedules,
consistency limits, limits on uploads and exact restore steps remain in the linked
records. Browser-only entries have no server-held user-state backup: deployment
artifacts/source offers are not backups of a user's browser work. Closing a tab
need not clear browser storage, and downloaded/copied files remain on the device.
Clearing the shared tools.utilibre.org origin also affects other tools there.

| Service/version | Processing and retained data | Active retention / backup set | Native export and scope | Import/reopen verification | Deletion and access | Evidence / verification date |
| --- | --- | --- | --- | --- | --- | --- |
| Spliit 1.29.0-p1 | Server-readable groups, participants, expenses/shares, notes and activity; browser recent-group links/preferences; Hosting only, uploads/AI/external rates off | No configured expiry / native PostgreSQL dump + private config, same-VM daily | Group Export JSON includes participants/expenses/conversions/activity; CSV is an expense table. Browser history/preferences omitted; no native import | Fictional JSON/CSV inspected; isolated database restored 1 group/1 expense/3 participants. Full workflow used private gateway; public readiness checked separately | Group link grants read/edit. Native expense deletion passed; history can retain labels. Whole-group removal requires operator administration; removing a recent link is only local | 2026-10-09: [Spliit record](spliit-deployment-2026-10-09.md) |
| Wishlist 0.67.1-p2 | SQLite profiles/lists/wishes/claims/membership/sessions; local uploaded images; Hosting + existing identity. No product fetch. Image URLs are accessible without login | No configured record expiry; orphaned uploads can remain / SQLite + files/config daily; text-only restore not an atomic image snapshot | No native bulk/account JSON/CSV export. Product-link Import is not backup import; keep independent wish details | Public OIDC and fictional group/list/item flow, private-list denial and isolated SQLite integrity/FK restore passed. An isolated installed-image check passed upload, direct item/image deletion, second-member claim/purchase/unclaim and deletion denial. Group deletion removed item rows but left the image accessible; [evidence](wishlist-image-claims-2026-10-09.md) | Native group/item cleanup and Admin → Users fixture deletion passed. Shared items can survive in other lists; image-file removal is separate. Identity account unaffected | 2026-10-09: [Wishlist record](wishlist-deployment-2026-10-09.md) |
| Opengist 1.15.2 | Server-readable snippet files, Git revisions/comments/account data; Hosting + existing identity; Gravatar/SSH off | No configured active expiry / native data/config snapshot, daily community runner | ZIP contains selected revision's files, not Git history/app metadata. Native HTTPS Git clone preserves reachable files/history, not permissions/comments/accounts | Private/unlisted/public access, revision ZIP, private Git clone/edit/push and isolated full native restore passed | Native snippet/account controls; revoke access tokens separately. Unlisted links grant read access. Deleting text in the latest revision does not erase older Git history | 2026-10-09: [Opengist record](opengist-deployment-2026-10-09.md) |
| linkding 1.47.0 | SQLite URLs/notes/tags/account/API metadata; Hosting + existing identity. Explicit URL metadata fetch contacts destination; native settings release check contacts GitHub with 1-hour cache. Background favicons/archives off | No configured bookmark expiry / native database/config backup, daily community runner | Settings Export Netscape HTML includes notes/tags/dates and archive/unread/shared markers; omits settings, API tokens, bundles and assets | Native HTML import preserved fictional notes/tags/archive/unread state; public OIDC and isolated service restore passed. Other browser importers may omit linkding fields | Native bookmark deletion; revoke API token separately. Operator-assisted account deletion. Sharing off by default, separately enabled public/shared views | 2026-10-09: [linkding record](linkding-deployment-2026-10-09.md) |
| Vikunja 2.7.0 | Server-readable tasks/projects/attachments/account/sharing state; Hosting + existing identity. External avatars, telemetry, mail and integrations disabled | Ordinary tasks: no configured expiry; generated export ZIP: 7 days / native dump + config daily | Settings Export ZIP contains projects/tasks/attachments/filters/backgrounds, not a complete identity/team/permission/session/settings migration | ZIP export/import created copies and preserved exact attachment; native isolated dump restore reopened both copies/files; public OIDC passed | Native task/project/link controls. Account deletion needs operator assistance while confirmation email is unavailable; shared ownership and recipient copies remain separate | 2026-10-09: [Vikunja record](vikunja-deployment-2026-10-09.md) |
| ByteStash 1.5.14-p1 | Server-readable snippets/fragments/categories/shares/account/API data; native browser login/preferences; Hosting + existing identity. Editor/changelog local | Active records: no configured expiry; recycle bin: 30 days; share expiry independent / database/config daily | Settings JSON exports active snippets/code/categories/metadata, not recycled entries, account settings/API keys/share credentials. Markdown is a readable copy | Native JSON download/import preserved fictional code; private/share/revoke/recycle checks, public OIDC and isolated full service restore passed | Recycle/restore/permanent-delete native. Revoke shares/keys separately; operator account deletion. Authenticated share admits any valid local account holding its link | 2026-10-09: [ByteStash record](bytestash-deployment-2026-10-09.md) |
| KitchenOwl 0.7.10-p1 | SQLite household/list/recipe/expense/account/tokens; uploads; Hosting + existing identity. Some household profile metadata visible to another authenticated user by ID; scraping/AI off | No configured general expiry / SQLite + uploads/config daily; text-only restore, no atomic image/database claim | Household Danger zone JSON contains supported household/item/category/recipe/expense/list-name fields. Omits image bytes, credentials/session/permissions and parts of list/planner history; import is narrower than export | Fictional item/category + recipe/ingredients round trip into second household; anonymous export denial and isolated SQLite/FK/file extraction passed. Image/expense migration untested | Native household and account deletion passed; token rejected. Shared records may remain unlinked; uploaded-image cleanup and identity revocation separate | 2026-10-09: [KitchenOwl record](kitchenowl-deployment-2026-10-09.md) |
| drawDB 1.8.2-p1 | Browser IndexedDB diagrams/templates plus namespaced preferences; Hosting serves local assets. No sharing backend/database connection | Browser data persists until removed/evicted; downloads remain / no server user-state backup | Diagram JSON and SQL DDL; definitions/relationships, not database rows or credentials | Fictional 2-table/foreign-key SQL + JSON import/export, fresh-browser JSON reimport and reload passed publicly; no external HTTP or POST | Use native local controls/site data; no server document account. Shared-origin clearing affects other tools. Per-record deletion was not a separate recorded regression | 2026-10-09: [drawDB record](drawdb-deployment-2026-10-09.md) |
| Bookbinder JS 1.7.0-p1 | PDFs in browser memory; bookbinderSettings/optional URL settings persist; Hosting serves local assets | Settings survive closure; input memory is transient; downloads remain / no server user-state backup | Native imposed PDF/ZIP outputs, not an account/history archive | Fictional 8-page PDF → ZIP containing 4 ordered sides; digital page positions and all 61 native tests passed. Physical print/duplex/fold untested | Native Reset Settings for preferences; remove downloaded files separately. No uploaded PDF copy to delete | 2026-10-09: [Bookbinder record](bookbinder-deployment-2026-10-09.md) |
| ChartDB 1.20.1-p1 | Browser IndexedDB diagrams and namespaced local settings/workspace/cache; Hosting only. No database connection, analytics/cloud/AI backend | Saved diagrams/preferences persist; downloads remain / no server user-state backup | Backup → Export Diagram JSON preserves supported schema/relationship/area/type/note data; SQL export is DDL, not database rows or credentials | Fictional SQL import/PostgreSQL DDL copy, JSON export/fresh-context import and saved reload passed; live metadata queries/every SQL dialect untested | Native diagram deletion or site-data removal. Shared-origin clearing affects other apps; independent exports remain | 2026-10-09: [ChartDB record](chartdb-deployment-2026-10-09.md) |
| SketchForge 3D 1.0.9-p1 | Local geometry kernels, IndexedDB projectShapes and namespaced browser settings/history; Hosting serves assets. No server/shared-project library | Browser projects/settings persist; downloads remain / no server user-state backup | Native SKF retains editable geometry and selected saved-action history; STL/OBJ meshes are not full editable-project backups | Fictional box → STL/SKF → reload/import SKF → matching exported triangle count; 282 native tests. No physical print/all-format promise | Browser project/site-data removal; no server project/account to erase. Shared-origin clearing affects other tools | 2026-10-09: [SketchForge record](sketchforge-deployment-2026-10-09.md) |
| Moodist 3.1.1-p1 | Browser-generated/local noise and tones; namespaced presets/preferences/notes/to-dos; scoped PWA assets. Hosting only, no radio/YouTube/microphone | Browser data/offline cache can survive closure / no server user-state backup | Native saved mix/share URL describes sounds/levels, not a full notes/settings backup. Independent important text copy recommended; full export/import not verified | Local/public noise playback and tone start/stop passed; unrelated browser state preserved. No preset/notes migration or server restore claimed | Stop playback; remove local records/site data as needed. Shared mix recipients retain sound settings; shared-origin clearing affects other apps | 2026-10-09: [Moodist record](moodist-deployment-2026-10-09.md) |
| OpenResume 4f8255a-p1 | Browser resume fields/PDF generation and parsing; persistent editable browser state; Hosting only. Analytics/count iframe removed | Browser state survives reload/closure; downloaded PDF persists / no server user-state backup | Download Resume PDF; not automatically encrypted or a lossless editable-project/account export | Fictional PDF generation, reload retention and native PDF parser passed on public HTTPS. Parsing is heuristic; full layout/field fidelity not promised | Clear this separate tool's browser site data; delete downloaded PDFs separately. No server document account | 2026-10-09: [OpenResume record](openresume-deployment-2026-10-09.md) |
| Radicale 3.8.3 | Server-readable CalDAV/CardDAV filesystem events/tasks/contacts; dedicated bcrypt calendar credentials; Hosting. Owner-only rights, separate from OIDC | No configured record expiry / native filesystem-lock archive + private credentials/config daily | Native web collection download or collection GET: ICS/VCF. No credentials/ownership/settings or external-attachment migration | Public native create/write/collection export/import, anonymous401/cross-account403/deletion passed. Isolated 12-resource byte match + native verify-storage; not full physical-client recovery | Native collection deletion and separate operator credential revocation. Synchronized device copies remain | 2026-10-09: [Calendar record](calendar-deployment-2026-10-09.md) |
| Calino 0.39.1-p1 | Browser calendar/contact working copy and reversibly obfuscated saved credentials; sync sends records to Radicale; Hosting, no external proxy/AI | Browser state persists; backend retention follows Radicale / no separate browser-state backup | Settings Data ICS/VCF exports loaded records, not a guaranteed complete historical server collection; use Radicale collection downloads for that scope | Public fictional event/contact sync and browser ICS/VCF download; UTC-export regression included in 38 tests. Not every event/attachment type or phone client | Native local reset removes browser data only. Selected server-calendar event deletion is separate; account revocation/collection deletion follow Radicale | 2026-10-09: [Calendar record](calendar-deployment-2026-10-09.md) |
| Chitchatter 23b62a8-p1 | Direct encrypted WebRTC text/files/calls; peer IP disclosure; Utilibre discovery/STUN metadata; browser identity/preferences. Hosting + own STUN, no third-party discovery/TURN | Transcript up to150 messages in memory; discovery expires after2 idle minutes, checked every30s/disconnect; browser keys/preferences persist / no persistent tracker volume or backup | Native file download; no complete conversation/account export or server history archive claimed | Public two-peer text, exact fictional file and generated-microphone track passed on one VM; not cross-network voice quality or all file sizes | Close/leave room and clear app browser identity/preferences as needed. Recipient messages/downloads remain; no server message archive to retrieve/delete | 2026-10-09: [Chitchatter record](chitchatter-deployment-2026-10-09.md) |
| Gathio 1.6.7-p1 | Server-readable events/images/attendees/optional contacts/comments; secret edit link; native DB operation/error identifiers; Hosting only, federation/email off | Events7 days after end via daily cleanup; operation/error DB logs no configured expiry / clean PostgreSQL/DocumentDB cluster + images/private config daily | Event ICS contains title/time/location/description; omits attendees/comments/image bytes/edit keys/settings; native import creates new event/key | Create/edit/wrong-key rejection/image/ICS round trip/public view/deletion passed. Full isolated clean-cluster restore reopened2 events+image; logical-only pg_restore not the tested path | Editor deletion; edit-link holder can manage. Unlisted event URL is not confidential. Downloads/recipient copies/backups remain | 2026-10-09: [Gathio record](gathio-deployment-2026-10-09.md) |
| URL Parameter Cleaner 1.1.0-p1 | Input/output in browser memory, no destination visits or URL uploads; Hosting serves static assets | Reload clears inputs/results; no saved history/localStorage/IndexedDB/cookie/service-worker state / no server user-state backup | Native rule profiles and optional reports; redacted reports still reveal domains/paths. Cleaned URLs preserve unknown/access/signature parameters | Public fictional cleaning/clipboard, redacted report and profile export/import passed; unrelated browser data untouched | Reload clears this app's memory; remove downloaded profiles/reports separately. No server URL record to delete | 2026-10-09: [Cleaner record](link-cleaner-deployment-2026-10-09.md) |
| Razzia 3.1.0-p1 | Server-readable quiz definitions and finished nickname/answer/score/rank/date files; live rooms/session RAM; browser reconnection ID/PIN/preferences; Hosting | Results/definitions no automatic expiry; abandoned-room grace5min, checked every1min / daily individually validated native records, no atomic multi-file claim | Quizz JSON includes definition/solutions/media URLs/timing, omits internal ID/results/manager secret/live rooms/media bytes. No native result export/import button | Public2-room score/control isolation, auth denial, JSON export/import, result view/deletion; isolated native restore2 quizzes+2 results passed | Trusted managers share stored library; native quiz/result deletions separate. Participants have no account. Log out/clear shared-device state; backups/copies remain | 2026-10-09: [Razzia record](razzia-deployment-2026-10-09.md) |
| Chhoto URL 7.8.3-p3 | Server-readable complete destination/query/fragment/notes mappings; admin session state; Hosting. Redirect contacts destination from visitor, no backend destination fetch/click counters | Anonymous links at most 30 days, resolution check + hourly cleanup / daily native SQLite backup + private config, no automatic expiry | Native UI copies created short link; no anonymous library/export/deletion token. This is not destination-content backup | 22 native tests, public create/clipboard/exact307/auth restrictions/zero hits and native isolated SQLite reopen passed; exact fixture deleted | Admin controls listing/edit/delete; anonymous early-removal requests use private contact. Possession reveals destination; expired/deleted mappings can remain in backups | 2026-10-09: [Chhoto record](chhoto-deployment-2026-10-09.md) |


| Unfurl 2026.10-p1 | Server URL parsing plus bounded header-only destination/redirect requests; Hosting, requested sites and Cloudflare/Quad9 DNS. No preview scripts; one-time URLs can be consumed or engagement recorded by destinations | No database/persistent URL history/cache/user-state backup; work in RAM. Browser history, theme preference and copied text remain. App/proxy access and Docker content logs disabled; other logs remain separate | Native Graph/Tree/Text and Copy tree results; no account/history archive or complete remote-content export. At most10 distinct URLs/100 nodes and 2 active jobs | Public native fictional URL/browser flow, 408 tests, controlled redirect cap/no-body and private-address/DNS-change/bypass checks passed. No arbitrary-site compatibility or AAAA transport test | No server history item to delete. Clear local history/copied files separately; no recall of destination logs. Restart reconstructs stateless workers/config, not user data | 2026-10-09: [Unfurl record](unfurl-deployment-2026-10-09.md) |
| 13ft 0.5.0-public1 | Server processes submitted URL and returned HTML; Hosting, selected source website and Cloudflare/Quad9 DNS. No forwarded source credentials; sandbox blocks source scripts/images/frames/fonts | No article database, persistent content cache/account or article backup. RAM is not guaranteed immediately erased. Access logs off; Docker diagnostics rotate 1 MiB × 2, not by time | Native readable HTML can be saved with browser controls; no account/history export or later article-retrieval API. Direct HTML 200 only, no redirects/login/JavaScript/archive fallback ; 2 jobs / 1 MiB decoded limit | Public fictional POST and EN/ES browser checks, 6 native tests, decoded-size rejection, private-address/DNS-change/bypass controls and scoped restart passed. No arbitrary publisher/paywall or offsite restore claim | No stored article identifier to remove. Clear browser history/saved pages separately; source/provider logs independent. Source/config/image recovery only | 2026-10-09: [13ft record](13ft-deployment-2026-10-09.md) |

These rows are reconciliation, not new tests or an independent security audit.
The dated records distinguish database integrity checks from full application
reopens, real public routes from intercepted/private browser checks, and native
export/import from an operator backup. Do not upgrade those claims from an HTTP
health response. No new service's limits establish heavy-workload capacity.

Unfurl and 13ft are live with their final public checks and bilingual guides.
Their stateless restart checks are not application-data restore tests.
The newsletter receiver is public with a verified routed receipt and native
feed/export/deletion checks. Addy's verified native recipient and requested alias
now have an owner-confirmed Gmail forwarding result with aligned SPF, DKIM and
DMARC. Its authenticated native reply also reached the monitored admin inbox;
the owner confirmed receipt and the local queue is empty. SimpleLogin remains private because of its legacy-framework security
findings. These distinct mail states and scopes are recorded in the
[complete service checklist](service-candidates-2026-10-08.md) and dated mail
records; receipt/signing does not establish a full mail archive or every route.

## Remaining facts affecting claims

- Reactive Resume native account ZIP and one extracted resume JSON reimport passed on 9 October. Letters, nonempty job applications, image files and complete account migration remain untested; the native whole ZIP is not a bulk-import format. Penpot basic editable file reimport passed on 9 October; shared-library, image/font and full account/team migration remain untested.
- Full CryptPad personal/team-drive export/import coverage, history and ownership
  migration: not promised by the guide.
- FreshRSS article JSON/ZIP fidelity passed for the bounded fixture; complete accounts, external media and other feed readers remain outside that check. The web feed export limit can omit retained articles.
- Wakapi historical import outside the allowed heartbeat age: not claimed.
- Rallly/Pollaris native complete poll import: no supported workflow established;
  CSV is documented as a readable results export, not a restoration archive.
- LiberaForms full-form migration is not claimed as tested. File attachments are disabled on this instance; do not enable them just to create an export test.
- FMD physical Android recovery, push delivery and account import from ZIP remain
  untested. Native browser decryption/download and local ZIP reopening passed with
  fictional records on 9 October; no native account ZIP-import workflow was found.
  No upstream-hosted retention period is applied to this instance.
- Backup expiry beyond the established core generations, edge/provider logging
  and access to correspondence: unknown, not filled with guessed durations.

Additional 9 October limits:

- Spliit native import/whole-group UI deletion, Wishlist bulk export and Razzia
  native results export/import are unavailable in the reviewed versions.
- Wishlist image/claim checks passed; group deletion leaves an uploaded file. KitchenOwl image/expense migration and atomic image/database snapshots remain untested.
- Calino complete historical exports, every recurrence/attachment type and
  physical CalDAV/CardDAV clients are not covered by the fictional browser/native
  requests. Radicale storage verification is not a full-host restore.
- Bookbinder physical printing/folding, SketchForge physical 3D printing and
  Chitchatter cross-network call quality are not claimed.
- Gathio's tested recovery uses the matching clean PostgreSQL/DocumentDB cluster;
  logical-only restore is not substituted for that successful path.
- Chhoto's normal public browser flow passed; generic Python requests encountered
  Cloudflare1010. Broad public programmatic-client compatibility is not promised.

## Original verification and cleanup — 8 October 2026

- Actual completed native Settings → Export data → Files → Import file → Actual
  → Select file, restoring the fictional cash account and 123.45 opening balance.
  Private `actual-result.json` records success at 23:07 UTC; `actual-budget.zip`
  contains the native `db.sqlite`/`metadata.json` export. The native API then
  deleted both QA budgets; the exact synthetic account was disabled and all its
  sessions revoked. No real budget or account was changed.
- CryptPad's new disposable account exported `cryptpad-keys.json` and
  `cryptpad-content.zip`; the first contains drive/access material but no
  fictional document body, and the latter contains the expected Code/Markdown
  text. This is content/keys separation and local ZIP readability, not a test of
  importing every document type or migrating a team. Native Destroy owned documents
  then Delete your account both passed at 23:10 UTC; no live fixture remains.
- Both FreshRSS disposable accounts were removed through native `deleteUser`
  after OPML import/export verification. Their temporary container OPML files
  were removed.
- Both Wakapi disposable accounts were deleted through the native Settings
  action; a scoped database lookup confirmed they no longer exist.
- Both `data1008` Authentik capacity identities were retired with the existing
  `capacity-users.py` maintenance script; its completion confirms identity
  sessions, tokens and MFA revoked. Operator identity was unchanged.
- Browser harness retries encountered a native Actual login rate limit and an
  unsupported Playwright restore of the budget's IndexedDB records. The passing
  run reused the already-issued synthetic native session and performed the
  complete export/import through the application. No production limit was
  loosened and no untested restore is represented as successful.

Wakapi retention clarification: pinned `services/housekeeping.go` deletes
heartbeats, durations and summaries before `models/user.go:MinDataAge`; the
configured three-month cleanup is broader than raw-heartbeat CSV scope. No
retention setting was changed.

## Further native workflows, 9 October 2026

These rows extend the existing record. Static tools pass through Cloudflare's
HTTPS proxy, Caddy and Hetzner; browser processing does not establish delivery
metadata retention. Only fictional data was used. Linked records contain pins,
versions, component licences and private evidence references.

| Service/version | Processing and retained data | Export/reopen check | Deletion and backups | Evidence / result |
| --- | --- | --- | --- | --- |
| The One File Core4.1.5-p1 | Downloaded local HTML contains diagram state | Native plain HTML save/reopen passed; faulty upstream encrypted export disabled. Whole-file hat.sh encryption is separate. | Delete downloaded copies on the device; no hosted notebook database. | [Record](one-file-core-deployment-2026-10-09.md), public/native checks passed |
| TiddlyWiki5.4.1-p1 | Downloaded notebook HTML | Native EN/ES save/reopen and tiddler deletion passed. | Save after native deletion; remove old copies separately. | [Record](tiddlywiki-deployment-2026-10-09.md), passed |
| Moocup1.0.50-p1 | Browser image processing, scoped IndexedDB | Native PNG/JPEG/WebP download passed; no full editable-project migration claim. | Reset leaves custom backgrounds; clear browser data and downloaded copies separately. | [Record](moocup-deployment-2026-10-09.md), public workflow passed |
| Rustpad54e4a93-p1 | Readable server text in memory, no database | Native collaboration/Copy passed; copied text excludes editor history. | Expiry24–25h from latest connection; restart loses pads; no persistent application backup. | [Record](rustpad-deployment-2026-10-09.md), public WSS/bounds passed |
| AutoRedact2.1.3-p1 | Browser OCR and local assets | Opaque PNG redactions and two-page PDF/ZIP outputs passed; visual review still needed. | Page state and downloaded files have separate lifecycles; no server document copy. | [Record](autoredact-deployment-2026-10-09.md), public outputs passed |
| Knit1.0.0-42be1d8-p1 | Pattern/row in URL fragment | Complete URL restored settings/row in fresh browser; row timing omitted. | Reset through base URL; remove saved URLs/history separately. | [Record](knit-deployment-2026-10-09.md), public round trip passed |
| NewTon5.4.0-p1 | Browser tournaments; server API omitted | Native JSON export/import, reload and deletion passed; invalid import identifiers rejected. | Remove native tournaments and old files/browser copies separately. | [Record](newton-deployment-2026-10-09.md), public workflow passed |
| Gravity1.0.0-28e912b-p1 | Browser simulation/settings | Tour/exploration/replay checked; no document export promised. | Browser preferences differ from asset copies; no simulation database. | [Record](gravity-deployment-2026-10-09.md), public workflow passed |
| Kokoro Web0.1.3-p1 | Browser speech; profiles keep text/settings in localStorage, model/voices in Cache API | Public EN/ES WAV24kHz, playback and profile save/reload/delete passed; no profile migration/WebGPU guarantee. | Delete profile or browser data; clearing all tools-origin data affects other tools. Downloads remain. No server text/audio backup. | [Record](kokoro-web-deployment-2026-10-09.md), public workflow passed with no outside requests/uploads |
| Family Chess f6e5093-p1 | Readable game/session SQLite and session cookies | No native export/import established. Isolated SQLite restore reopened exact board/two moves; native two-player/spectator/SSE/mobile checks passed both privately and through actual public HTTPS, including EN desktop and ES mobile. | Seven-day cleanup from creation; no immediate user delete. Daily same-VM backup has no automatic expiry and is not rewritten by active deletion. | [Record](family-chess-deployment-2026-10-09.md), public edge/workflow checks passed; configured pilot limits remain |

Projects 1.3.0-455aa274-p2 adds readable PostgreSQL board/account/session state
and uploaded files. Native board CSV was downloaded at EN desktop and ES390px;
it includes card/list fields and task counts, but not task text, comments, files,
permissions or a restorable board. No CSV import is promised. Explicit attachment
deletion removes the active file; project/account deletion retains archive or
identity fields. Daily same-VM backups have no expiry. A consistent database/file
backup restored six table counts, both fictional cards and both attachment byte
strings in isolation. Native two-account boundaries and rejected-account OIDC
passed. Actual public HTTPS/OIDC/MFA, independent-account denial, viewer
permissions/revocation, card/attachment/CSV workflows and EN/ES desktop/mobile
checks passed. Exact fictional data was deleted and its identities retired. See
[Projects evidence](projects-deployment-2026-10-09.md).

## Donetick and Beaver, 9 October

| Service/version | Data and provider path | Retention/export/deletion | Verification |
| --- | --- | --- | --- |
| Donetick 0.1.80-p3 / frontend 1.2.55 | Readable SQLite/local attachments; existing approved-account identity service; public Cloudflare/Caddy/Hetzner route verified. Signed attachments are capabilities lasting up to7days; known profile paths are public. | No automatic chore expiry. No general native user export/import; keep independent notes/files. Native account deletion follows shared-circle rules and now explicitly removes its refresh sessions in p3; empty circle metadata can remain. Daily same-VM backups, no pruning. | Two native OIDC/MFA users, circle isolation/sharing/revocation, HTML/asset boundaries, deletion and disconnected native task/file restore passed. Actual public OIDC/workflow/desktop/mobile checks passed. p3 additionally passed session-deletion regression, public token rejection and post-deletion backup integrity; no new full restore claimed. See donetick-deployment-2026-10-09.md. |
| Beaver 0.10.0-p7 | Readable account/habit/note/image SQLite plus native session files; local assets and no external integrations. Native operator-provisioned accounts, no trusted-email bypass or public registration. | No automatic habit expiry. UI JSON exports active habits/records/notes, omits archived records/settings/image bytes; raw API includes archived records. Native account deletion removes its list/settings/images after explicit token revocation. Session/log/backup copies are separate; daily same-VM backups, no pruning. | Two native accounts, UI JSON round trip, token revocation/account deletion and disconnected restored habit/completion passed. Actual public login, account boundaries, habit/JSON workflow, desktop/mobile and Secure cookie checks passed. Image/settings migration remains untested. See beaverhabits-deployment-2026-10-09.md. |

TRIP 1.50.1-p2 (9 October): readable SQLite/files on a dedicated 1 GiB filesystem; ordinary records have no automatic expiry. OSMF/Fastly tiles are fetched by the browser, Photon searches/FOSSGIS routes by the server, and chosen Google Maps navigation opens externally. Cloudflare HTTPS and Cloudflare/Quad9 DNS have distinct roles; recursive-DNS policies are linked in privacy.md. No deletion deadline was established for OSMF tile logs, Photon queries or FOSSGIS route logs. Native owned-content ZIP export/import, two-account PDF/isolation/sharing, capability-image deletion, administrator account deletion with service-grant revocation, and disconnected production-backup restore passed using fictional data. Daily same-VM backups retain earlier data without pruning. Public HTTPS/OIDC login and desktop/mobile rendering passed with two fictional accounts, including one real 35-tile map view; repeated views used fixture tiles. Exact settings and evidence: `trip-review-2026-10-09.md`.
