# Catalog copy coverage — 9 October 2026

All 87 canonical catalog records were reviewed. Twenty-nine have wording
changes; 58 are retained. The review covers English and Spanish names,
descriptions, selection guidance and visible actions. Spanish uses voseo.
Privacy, access, recovery and deletion instructions remain literal; they do not
receive jokes or a new marketing assurance.

The changed wording makes tasks easier to recognize: saving links does not
suggest that linkding archives entire pages, the URL inspector explains parts
of a URL, and the calendar description includes contacts. Account requirements,
disabled features and other limits stay attached to their existing records.
The uptime description now refers to service responses, avoiding a blanket
HTTPS claim for a monitor that also contains TCP checks.

## File dispositions

Paths in this table are relative to `portal/src/`.

| File | Disposition and boundary |
| --- | --- |
| catalog/catalog.ts | Updated selected task names and descriptions. Application IDs, access gates, URLs, statuses and operational settings are unchanged. The exact protected-data comparison below covers all generated records, not only this file's literals. |
| catalog/account-additions.ts | Updated Wishlist gift wording, Opengist revision wording and linkding links rather than archived pages. Other account-app records and all control/export/deletion instructions retained. |
| catalog/calendar-additions.ts | Calino description now states calendars and contacts and keeps the approved calendar-account requirement. Radicale and all credential/storage/permission details retained. |
| catalog/social-additions.ts | Gathio description simplified. Chitchatter and the local cleaner retained, including their different processing and connection models. |
| catalog/reader-addition.ts | 13ft description and Best for wording simplified. Direct-HTML restrictions, scripts/resources blocked, outbound processing and all other limits retained. |
| catalog/unfurl-addition.ts | URL components described as parts of a URL. Server processing remains explicit; destination engagement, redirects, providers and limits retained. |
| catalog/selection.ts | Four Best for descriptions made concrete: Rallly, OmniTools image editor, miniPaint and SVGEdit. Every limitation string retained. |
| catalog/discovery.ts | Kept familiar search terms after task-name changes: búsqueda, CV, collaborative/diseño, personal budget, notebooks/cuadernos, vectors, developer/desarrollo and UUID. Existing matching, normalization, categories, visibility and sorting logic retained. |
| catalog/razzia-addition.ts | Retained: room PIN/nickname, shared manager access, result scope and restart limits are already concrete. |
| catalog/chhoto-addition.ts | Retained: expiration, readable destination, no click collection and operator-assisted early deletion are already explicit. |
| catalog/guidance.ts | Retained: account access, invitation/recovery, encryption distinctions, retention qualifications and actual test scope. No new verification promise. |
| catalog/locale-links.ts | Retained: installed-application language paths and parameters are functional configuration, not editorial wording. |
| catalog/upstreams.ts | Retained: names, releases, source references, licences and unresolved grant precision are evidence fields. No guessed SPDX suffix or version change. |
| components/catalog-ledger.ts | Retained: task actions, accessible new-tab labels, privacy questions, access-request email and support instructions remain clear and literal. Labels taken from translations stay under the parent translation review. |
| components/privacy-labels.ts | Retained: visible labels, explanations and accessible labels continue to share the existing translation source. |
| pages/policy-pages.ts | Reviewed and retained: verified email/private-report links and policy/abuse section wiring. No legal commitment, scope, contact or policy substance changed. |

## Every record

The groups below are a complete, disjoint partition of the 87 record IDs.

| Disposition | IDs |
| --- | --- |
| Updated descriptions or selection wording | wishlist, opengist, linkding, calino, gathio, unfurl, 13ft, bookbinder, fourget, uptime-kuma |
| Updated task names, sometimes with descriptions/selection wording | reactive-resume, penpot, actual, rallly, wakapi, jupyterlite, ntfy, svgedit, cyberchef, zip-manager, audiomass, minipaint, omni-image-editor, miniqr, ittools, searxng, freshrss, redlib, privatebin |
| Retained account, collaboration and new-service records | spliit, kitchenowl, vikunja, bytestash, openresume, radicale, chitchatter, link-cleaner, razzia, chhoto, moodist, sketchforge, chartdb, drawdb, cryptpad, liberaforms, galene, wbo, pollaris |
| Retained external-content, communication and monitoring records | breezewiki, priviblur, mezzo, fmd, lrclib, libremdb, degoog, safetwitch, anonymousoverflow, kittygram, rimgo, mumble, biblioreads, gothub, binternet, translite, rssbridge, yopass, pairdrop |
| Retained browser tools and existing integration | super-productivity, mapshaper, numbat, markmap, excalidraw, image-scrubber, rawgraphs, omni-background, omni-compress-image, omni-trim-audio, omni-csv-json, omni-deduplicate, bentopdf, vert, omnitools, hatsh, drawio, qr-offline, private-router |
| Retained withdrawn record, still disabled | whisper-web |

## Preserved facts and verification

A serialized before/after comparison checked all fields of all 87 materialized
records. Only `name`, `description` and `bestFor` changed, with one explicitly
reviewed formatting exception: the paired em dashes in Redlib's EN/ES
`temporaryStorage` paragraph became parentheses. The words and challenge-state
facts in that paragraph are unchanged. No other privacy/provider/retention,
licence/version, access, deletion/help, label, verification or implementation
field changed. No catalog or owned component/policy prose now contains an em
dash. The search punctuation fixture still deliberately uses one as test input.

Private comparison artifacts are
`/opt/utilibre/reports/new-services-20261009/catalog-before-voice.json` and
`catalog-voice-changes.json`. They contain public catalog data, not user records.

The existing search regression caught the loss of the familiar Spanish noun
“búsqueda” after changing a title to a verb. Existing synonym data now preserves
that and other replaced terms; no new search engine or matching algorithm was
added. The added regression checks familiar English/Spanish searches and UUID.
Final focused catalog/discovery, FOSS, localized-launch and route tests: **44
passed**. Typecheck and ESLint for all owned catalog/components/policy files and
the changed search test also pass. No new dependency or tracker was added.

The parent owns the assembled bilingual build, representative rendered/mobile
review, deployment and post-release SEO audit. This file records source review
and focused checks; it does not label an unperformed production copy release as
deployed.

## Precise retained limits

- Upstream interfaces were not rewritten. The catalog keeps existing warnings
  when a native app lacks Spanish, or when literal English control names help
  locate export/deletion actions.
- Ambiguous GNU licence version grants stay explicitly unconfirmed in the
  existing licence review; editorial work cannot resolve a missing grant.
- Unperformed physical-device, full-account migration and offsite recovery
  checks remain as qualified in the existing evidence records. This review
  performs none of those tests.
- The exact cached bookmarks robots response still needs its separate expiry
  recheck, as recorded in the indexing review. Account protection is unchanged.
- The three staged mail applications and the PLANKA/ZipCaptions exclusions stay
  in the execution checklist; copy changes do not make them public services.

## Application notices, branding and email

**Follow-up:** [native-wording-2026-10-09.md](native-wording-2026-10-09.md) records the later authorized deployments. PairDrop’s label, LRCLIB/TransLite/Chhoto bilingual notices, and the two native identity email templates are now live; it supersedes their earlier pending status below. WBO’s two landing punctuation changes are now live in p3 after the native-history preservation procedure in [the dated record](wbo-ram-update-2026-10-09.md).

The following review covers operator-owned wording in deployment files and
supported native fields. It does not claim that upstream application interfaces
have been fully rewritten or translated. Application behaviour, privacy facts,
limits and upstream attribution were retained.

| Surface and source | Disposition and evidence |
| --- | --- |
| Public technical source inventory: `deployment/toolbox/source-index.html` | Reviewed every entry and added equivalent EN/ES text with voseo, using static HTML only. All 69 existing distinct download URLs, application versions, licence identifiers, ambiguous grant qualifications and original English technical notes remain; prose em dashes became middle dots. Underlying licence files, grants and dependency notices were not edited. Whisper is explicitly withdrawn/historical in both languages. Added only the three verified mail source offers, with hashes and staged/isolated availability qualifications; SimpleLogin's dependency block remains explicit. Publication is the parent's separate final source-index step. |
| Uptime Kuma public status description/footer: `deployment/community/status-page-copy.mjs`, `bootstrap-kuma.mjs`, `update-kuma-monitors.mjs`, `update-kuma-copy.mjs` | Updated live through native `saveStatusPage`, only `description` and `footerText`. Both languages now state the same check scope, five-minute interval, same-VM outage limitation and history/availability notice. The existing EN/ES catalog links remain. Source constants prevent routine configuration helpers reverting the wording. The full bootstrap and monitor updater were not run. |
| WBO board notice: `deployment/community/wbo/utilibre-notice.js`, `nginx.conf`, `publish-wbo-source.sh` | Updated live: English heading uses a comma; Spanish says “No usés datos sensibles.” The existing supported head hook loads the mounted notice through one exact gateway route. Only the gateway was reloaded, so in-memory boards were preserved. No scene-reading, tracking or response-rewriting code was added. |
| WBO landing: `deployment/community/wbo/index.html` | Two punctuation-only changes are live in p3: title separator and English introductory comma. A zero-client gate and rehearsed native-history transfer preserved the existing board; no regular-file board archive or persistent mount was added. The host-swap limitation is explicit in the preservation record. All existing privacy/retention warnings remain. |
| Static tool language handoff: `deployment/toolbox/language.html`, `language.js` | Retained: short bilingual opening/continue text and voseo failure message. Existing language preference handling is unchanged. |
| Markmap: `deployment/toolbox/markmap/index.html`, `main.js` | Retained: task-led bilingual labels, confirmations, errors, fictional outline and explicit storage/export/network limits. Spanish already uses voseo; literal format/control names remain useful. |
| VERT: `deployment/toolbox/patch-vert-copy.mjs` | Retained all seven EN/ES installation notices. They distinguish local processing from delivery metadata, browser storage, unavailable remote video and upstream donations; Spanish already uses voseo. |
| FMD: `deployment/community/fmd-privacy-source.patch` | Retained the bilingual native privacy page and links. Encryption, metadata, provider, backup and deletion qualifications stay unchanged. Its notice explicitly says that other FMD controls may remain in English. |
| Kittygram: `deployment/community/compose.kittygram.yaml` | Updated live through the supported `ABOUT_MESSAGE` field: equivalent Spanish preserves the English privacy facts and adds matching language-specific privacy/catalog links. Only the application was recreated; cache and gateway IDs/start times were unchanged. Public HTML and browser checks passed for both paragraphs, four links and the source download; no external request was observed. |
| SafeTwitch: `deployment/community/safetwitch-source.patch` | Retained EN/ES deployment privacy paragraphs and source links. Spanish already uses voseo; searches, followed-channel requests, browser storage and source-provider behaviour remain qualified. |
| QR offline, Bookbinder, Moodist, drawDB, SketchForge, ChartDB and OpenResume existing source patches | Reviewed operator return/source links and locally added explanations. Retained ordinary optional links and original attribution. No new promotional UI fork; literal upstream controls remain. |
| Chitchatter, link cleaner, Unfurl, 13ft and Gathio existing patches/configuration | Retained task and privacy notices, bilingual optional return links where supplied, precise failure messages and relevant controls. No privacy promise was made more absolute. |
| PrivateBin info, RSS-Bridge message, Opengist static links, CryptPad AppConfig and Jupyter help | Parent reviewed and retained the existing native configuration. Review and actual return-link scope are also recorded in `instance-navigation.md` and `instance-indexing-2026-10-09.md`. |
| LiberaForms feedback introduction and identity email subjects | Parent corrected the existing native feedback field to voseo and set the bilingual recovery subject. Registration subject is “Utilibre · Verify your email / Verificá tu correo”; recovery is “Utilibre · Reset your password / Restablecé tu contraseña”. No email was sent in this copy review. |
| Authentik installed confirmation/reset email bodies | Read-only review of upstream `email/account_confirmation.html`, `email/password_reset.html`, the native recovery blueprint and `/locale/es_ES/LC_MESSAGES/django.mo`. Bodies remain upstream-managed; confirmed Spanish phrases include tú forms such as “debes”, “tienes”, “Usa”, “copia” and “ignora”. This is a precise remaining native-language limitation, not a claim that all mail now uses voseo. No upstream template fork or translation-file replacement was introduced. |
| Operator alerts: `deployment/community/monitor-alerts.mjs`, `scheduled-backup.mjs`, `scheduled-account-backup.mjs` | Reviewed and retained literal English service/resource failure and recovery messages. These go to the operator, not visitors; they contain operational states and instructions, not customer content. No alert script was executed and no test message sent. |
| Staged newsletter/alias applications | New-mail deployment remains a separate workstream. `deployment/newsletters/operator-copy.patch` retains the operator contact routing and upstream attribution; its additional footer is English-only. Staged applications are not represented as fully translated public services. |

### Native verification and recovery

The public source inventory has **49 paired bilingual entries**: 46 existing
application/component rows, including the formerly separate Wakapi paragraph,
and three mail source rows. A parser verified balanced HTML and preservation of
all 69 previous distinct download links. Every referenced download exists in
the published source directory, and all **72 distinct download URLs returned
HTTP 200** through public HTTPS HEAD requests. All three new mail archive
SHA-256 values match the final source-offer record. Desktop and 390px mobile browser checks passed
with JavaScript disabled: no overflow, working keyboard navigation, both
languages present and no network requests. No script, dependency or tracker was
added. English application notes were compared to the prior page and retain
every technical statement apart from punctuation and the added historical
Whisper label. Evidence: `source-index-before-voice.html`,
`source-index-copy-verification.json` and `source-index-link-checks.json` under
the same private report directory. This is a checked source edit, not a claim
that the bilingual index has already been published.

Kuma's scoped updater saved private before/after native configuration under
`/opt/utilibre/reports/new-services-20261009/kuma-copy-1791512405194/`.
The full public group contents and order are unchanged. Read-only before/after
database checks preserved the exact monitor, setting, notification,
monitor-notification, user and incident rows; an earlier heartbeat remains.
Native group join-row IDs may be rewritten by `saveStatusPage`; this is not a
monitor or history change. Browser checks at the public status URL passed for
the exact bilingual description/footer and both catalog links. Analytics stays
disabled. Recovery is to restore only the two native copy fields from the saved
configuration, preserving current groups and all other fields.

WBO's public two-session check passed at **02:26:24 UTC on 9 October**:
English/Spanish notice, two-way drawing, disconnect/reconnect and scene replay,
SVG export, native Eraser removal of only the two newly created synthetic
objects, localized desktop/mobile landing, foreign-origin refusal, source
download and oversized-request refusal. It observed no external request. The
anonymous native toolbar has Eraser, not privileged whole-board Clear; the
existing check now follows that real control. Report:
`/opt/utilibre/reports/new-services-20261009/wbo-copy-public.json`. A later
public check at **13:03:06 UTC** also passed the now-live landing punctuation,
two-session drawing/replay/export and exact preservation after fixture erasure;
see `/opt/utilibre/reports/wbo-ram-update-20261009/public-browser.json`.

The gateway's previous configuration is retained privately in the WBO copy
evidence directory. Recovery requires only restoring the notice file or its
exact route and reloading that gateway after a configuration check; it requires
no board restoration or application restart. The source offer includes the
notice and existing build recipe. The earlier notice-only archive SHA-256 was
`689ac8344da66012146155e7db4855977a6de243cbfbfac6a7a9e2f3ed847ad7`.
Kittygram’s native-field backup and public check are under
`/opt/utilibre/reports/new-services-20261009/kittygram-copy-1791512954/`;
its updated source archive SHA-256 is
`5396b0c6c12f678b0b8878978d7a0214aa774d815460a5a3369704c72d289def`.
Recovery restores only its previous `ABOUT_MESSAGE` and recreates that app,
preserving cache and gateway. Syntax checks pass for all changed JavaScript
and shell helpers; the WBO Nginx check passed before reload.

### Remaining native-copy boundaries

- The previously English-only LRCLIB, TransLite and Chhoto operator notes now
  have equivalent Spanish in the existing source patches and live applications;
  see the dated native-wording follow-up. Other native controls remain upstream
  interfaces, not a claim of complete application translation.
- PairDrop’s clearer bilingual custom-button label is now live after repeated
  zero-client checks and its scoped native recreation; see the follow-up.
- Vikunja now exposes both catalog links in authenticated Settings using its
  native OIDC `extra_settings_links` claim, verified after public MFA sign-in
  on desktop and mobile. Eight other additions have no supported arbitrary
  anchor in the installed native settings; exact source evidence is recorded
  in `instance-navigation.md`. No promotional UI fork was introduced.
- Installed upstream interface translations can differ from Utilibre’s voseo.
  The two identified identity email bodies now use supported native voseo
  templates. Other upstream messages were not rewritten; catalog/guides retain
  truthful language limitations and literal native control names.
