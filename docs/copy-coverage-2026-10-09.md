# Sitewide copy coverage, 9 October 2026

## 10 October requested follow-up

Deployed portal image: `public-utility-portal:0.1.0-copy-moodist-20261010`.
EN/ES header defaults now say "Free and open-source tools." / "Software libre
y gratuito." The homepage gives concrete task examples and removes the
redundant hosting slogan. Sources: `src/i18n/{en,es}.ts`, `src/config.ts`,
`src/pages/pages.ts`, and the matching server defaults. No layout or styles
changed. Addy's card, help note and EN/ES guide no longer publish the dated
forward/reply test narrative; practical self-check instructions replace it.
Access, mail limits, privacy and retention facts are unchanged. Historical
test evidence remains in the operator deployment record.

The same release updates Moodist's EN/ES card/help/guide and search synonyms
for its larger sound library; see `moodist-deployment-2026-10-09.md`.
All current-worktree lint/typecheck/build checks and 101 unit tests pass.
The isolated release's 99 tests also pass; it excludes the two unrelated
pending status-concurrency tests and their implementation.
Private preview checks cover both homepage languages at 1280px/390px, both
Addy and Moodist guides, catalogue search, overflow and server-rendered HTML.
Live public EN/ES homepage, Moodist search and Addy-guide browser checks pass.
The running portal reports healthy. No SEO indexing/ranking claim is made.

Release isolation: built from the previous published source plus these scoped
edits, not the large dirty worktree. Unreleased status-concurrency code/tests
remain untouched and excluded. Matching release source and rollback material
are in `/opt/utilibre/portal-copy-NfsEis`; `rollback.env` contains private
configuration and must never be published. To roll back just the portal,
set `PORTAL_IMAGE=public-utility-portal:0.1.0-upstream-facts-20261009` in `.env`
and run `docker compose up -d --no-deps --no-build portal`; restore the previous
integration archive and index from that release directory. Neither release
nor rollback touches application/user data. No broad Git commit was made.

## Original 9 October pass

This pass follows the completed installation and SEO checkpoints. It changes
editorial presentation, preserving the correction addendum's verified facts and
reviewed policy commitments. English and Spanish use the existing dictionaries
and bilingual records; Spanish always uses voseo. No other portal locale exists.
No CMS was found: these source files generate the portal and supported instance
configuration supplies the operator-owned text listed below.

Status: completed and deployed as `public-utility-portal:0.1.0-copy1-20261009`
at 02:38 UTC on 9 October. Source, build, browser and public SEO checks pass.
The precise upstream/configuration limits below remain recorded separately. The 9 October native follow-up is documented below and in `native-wording-2026-10-09.md`.

## Coverage records

The following records form one coverage inventory. Each identifies updated,
reviewed-and-retained, or precisely inaccessible/unsupported surfaces.

- [Interface and metadata](copy-coverage-interface-2026-10-09.md): shared EN/ES
  dictionaries, homepage, About, navigation, footer, search, forms, support,
  status, 404, accessible names, titles and social text.
- [Catalog and protected notices](copy-coverage-catalog-2026-10-09.md): all 87
  catalog records, disclosure renderers and supported instance text.
- [Complete guide collection](copy-coverage-guides-2026-10-09.md): all 50
  practical guides, their shared index/template, PDF/QR task guides, export and
  deletion instructions and practice files.

## Additional canonical sources

| Surface / routes | Source | Language / sensitivity | Disposition |
| --- | --- | --- | --- |
| Personal collections, empty/shared preview, export/import/reset and errors; `/en/my-utilibre`, `/es/mi-utilibre` | `portal/src/pages/my-utilibre.ts` | EN/ES inline paired strings; browser storage and destructive action scope | Updated introduction, shared preview explanation and QR/export prose. Retained literal controls, limits, permission warnings, errors and deletion confirmations. No storage behavior changed. |
| Offline preparation; `/en/offline-tools`, `/es/herramientas-sin-conexion` | `portal/src/pages/offline-tools.ts` | EN/ES; offline evidence and cache/deletion scope | Updated introductory task, tested-features heading and two instructions for clarity. Preserved actual test limits, untested phone/OS installation, retained history and separate downloads. |
| Local URL router and its validation/copy states | `portal/src/tools/private-router.ts` | Labels from shared EN/ES dictionaries; URL/privacy sensitive | Reviewed and retained rendering/behavior. Dictionary edits are in the interface record. The router still sends no request to the destination until the visitor follows a link. |
| Collection defaults and import schema | `portal/src/utilities/toolkits.ts` | EN/ES default collection name; limits/schema | Reviewed and retained. Schema errors are mapped to authored page messages; no raw error becomes public text. |
| DOM/action/status helpers | `portal/src/utilities/dom.ts`, `random.ts` | Shared rendering, no independent prose | Reviewed and retained. Visible names/status messages come from callers. |
| Canonical and sharing title formatting | `portal/src/seo.ts` | Both locales, SEO | Changed title separator from an em dash to a vertical bar. Canonical URLs, language alternatives, schema, privacy exclusions and indexing behavior retained. |
| Initial server HTML and non-JavaScript fallback | `portal/server/server.mjs` | EN/ES, metadata/accessibility | Localized the Spanish sharing-image alt. Existing localized fallback and protocol error messages retained; no caching, service configuration or status behavior changed in this copy pass. |
| Development/static HTML before rendering | `portal/index.html` | EN fallback; production replaces it with localized server content | Removed stale small-collection and server/paid-account claims. Clarified the local-preview fallback instead of claiming the published catalog requires JavaScript. |
| Tagline defaults and runtime public config | `portal/src/config.ts`, `portal/server/server.mjs`, `compose.yaml` | EN/ES plus language-selected default; configuration | Reviewed and retained verified taglines and language settings. No config values changed for copy. |
| Locale selection/fallback and route mapping | `portal/src/i18n/index.ts`, `portal/src/routes.ts`, `portal/src/vite-env.d.ts` | EN/ES, links/placeholders | Reviewed and retained. Typed dictionaries require both locales; slugs, anchors and language-switch mappings retained. |
| Styles and image/logo assets | `portal/src/styles/main.css`, `portal/public/brand/`, `portal/public/favicon.svg` | Visual assets; mandatory attribution | Reviewed assets and retained them. Added overflow wrapping to page headings after the Spanish 404 overflowed at 200% text size on a 375px viewport. Existing homepage four-card layout preserved; no voice patch to SVG artwork or generated images. |
| Public licence/security/crawler files | `portal/public/legal/`, `portal/public/.well-known/security.txt`, `portal/public/robots.txt` | Legal/machine-readable | Reviewed and retained substantive notices and directives; replaced only punctuation in the security-file comment. Security expiry and targets are checked separately by the existing build/SEO checks. |
| Public source-download index | `deployment/toolbox/source-index.html` | Static bilingual EN/ES, legal attribution and technical scope | Reviewed all 49 entries and added equivalent Spanish; preserved versions, licences, qualifications and 69 existing download targets. Added three staged mail source offers. Whisper is explicitly historical. No JavaScript or dependency added; source documents remain unmodified. |
| Project introduction and contribution guidance | `README.md`, `TRANSPARENCY.md`, `CONTRIBUTING.md`, `docs/adding-a-language.md` | English operator/contributor documentation | Updated introduction and current-catalog links, removed stale app enumeration, corrected the already-working private contact reference and made voseo explicit. Preserved AI-assistance disclosure, licence and policy rules. |
| Voice guidance | `docs/copy-style.md` | English contributor instructions with EN/ES examples | Replaced conflicting older humour/Spanish guidance. Describes restrained surfaces, factual boundaries, voseo, selective editing, source ownership and checks. |
| Public feedback introduction and fields | `deployment/pack/feedback-intro.md`, `feedback-fields.json`, `set-feedback-intro.mjs` | Bilingual; encrypted-response and deletion/backup facts | Corrected one negative imperative to voseo. Applied only the operator-owned feedback introduction using the existing native method; fields, permissions and response records untouched. Rest retained. |
| Identity invitation/recovery text | `deployment/identity/configure-apps.py`, `configure-recovery.py`, `configure.py` | Bilingual configured subjects/titles; literal authentication | Invitation/verification/password-rule text reviewed and retained. Recovery subject now includes EN/ES; applied only the native email-stage subject, leaving token expiry, MFA, permissions and accounts unchanged. No test email submitted. |
| Application language handoff | `deployment/toolbox/language.js` and existing language HTML | EN/ES errors/actions; preference persistence | Reviewed and retained. Native preferences/redirects unchanged; no runtime text replacement added. |
| Supported native return links and application notices | `docs/instance-navigation.md`, `docs/instance-indexing-2026-10-09.md` and their named configuration files | EN/ES where supported; privacy/attribution | See native coverage in the catalog record. Existing upstream bodies remain upstream-owned; no application fork or response injection for voice. |

## Preserved boundaries and remaining facts

Reviewed privacy/security/abuse/retention/closure wording keeps its substance.
Provider and edge-log retention, mailbox provider defaults/delegated access,
physical Android/phone tests, full offsite recovery and other explicitly untested
workflows retain their qualifications. The copy pass does not publish a promise
that depends on those missing facts. No operator identity, legal establishment
or response guarantee was invented.

Mail transport work is separate operational work already authorized before this
copy pass. The two private SMTP destinations are documented in
[the Proxmox handoff](../deployment/mail-routing/proxmox-transports.md). The operator-controlled newsletter test reached its native Atom feed.
The earlier Addy setup-message checks are historical: native recipient
verification and the requested alias configuration are complete. The owner
confirmed the14:09UTC native forwarding test in Gmail with SPF, DKIM and DMARC
passing; PMG signs that route with selector `pmg`. Native authentication-only
Rspamd is now deployed, and its seven isolated decision tests and live local
configuration check pass. The owner subsequently confirmed that the native
Gmail reply reached the original sender’s inbox after PMG accepted it at14:36:49UTC.
These results do not establish every sender’s delivery
or receipt of each earlier setup message. Both web A records are present,
direct edge HTTPS works, and the operator confirmed both sites open in an
outside browser. The VM-to-public-IP return-path limitation remains separate.
SimpleLogin remains blocked by its dependency review. Backup schedules and
retention remain unchanged at the owner’s explicit request.

The operator purged the stale bookmarks crawler object. The exact canonical
URL now returns the corrected robots file with noindex, while the protected API
continues to return 401; see [verification](instance-indexing-2026-10-09.md). Copy and portal
indexing changes do not require removing useful caching or exposing private data.

## Verification and delivery

- Build, TypeScript typecheck, ESLint, security-contact freshness and existing
  FOSS-policy checks pass. Existing SearXNG pagination/redaction checks pass.
- All 95 unit tests pass. Two stale assertions were aligned with the reviewed
  PDF/OCR delivery facts and title punctuation. The 718KiB asset byte check now
  uses Node's byte equality rather than a slow recursive matcher; its complete
  cold/warm/HEAD expectations are preserved and its 12-test file passes.
- The full browser run passed 68 of 74 cases; the six failures were old service
  names in three tests, each run on desktop and mobile. All six pass after
  aligning their expected accessible names; the focused repeat passed 12 cases.
  No functional assertion was removed. All guide registry/browser cases passed.
- Both languages retain 324 dictionary keys. Scoped whitespace and helper syntax
  checks pass. No em dash remains in portal TypeScript user-facing sources.
- Visually inspected the homepage difference section at desktop/mobile sizes and
  the Spanish 404 at enlarged text size. Its 200% text check now fits 375px
  without horizontal overflow. Twenty representative EN/ES rendered preview
  pages pass layout and unresolved-marker checks; screenshots cover each family.
  Reports are under `/opt/utilibre/reports/copy-20261009/`.
- Public desktop/mobile homepage review confirms the four separate difference
  items and links, in EN/ES. Four public browser cases (both languages with and
  without JavaScript) pass; essential navigation remains visible without JS,
  no external request was observed, and the new copy/source revision is live.
- The public status API still returns all 76 configured observations as
  operational after the portal-only deployment. This checks endpoints, not full
  application workflows; the known unavailable/degraded catalog states remain.
- Live security.txt returns HTTP 200 as `text/plain; charset=utf-8`, with the
  verified admin contact, private GitHub intake, EN/ES preferences and
  30 September 2027 expiry. Contact and policy fields are unchanged.
- The complete public SEO audit passes for all 130 canonical pages: unique
  metadata, reciprocal hreflang, schema, initial guide links, sitemap discovery,
  expected indexing, no external scripts/cookies and preserved CSP.
- The bilingual source index passes desktop/mobile no-JavaScript layout and
  keyboard checks; all 72 distinct download targets return 200. The final three
  mail downloads were checked against their newly published SHA-256 values.
- Known inaccurate storage slogans and unresolved `(verify)`, `(set up)` and
  `[counsel]` markers are absent from portal sources and generated output.

The running portal container is healthy. Only the portal was recreated for this
release. The previous apps5 image and private pre-copy1 environment snapshot
remain available for rollback; backup retention is unchanged. Reviewed indexed
integration source was published for the app as revision `20261009-copy1`; the
completed records and bilingual source index are offered as `20261009-copy1-final2`.
No commit was
created. Native Kuma, WBO notice, Kittygram, feedback introduction and identity
recovery subject changes are also applied; their precise scope and recovery
are recorded in the component inventories.

## Representative editorial changes

- “Free to use. Not free to run.” became “If you would like to support Utilibre,
  donations help cover hosting and maintenance.” The invitation is voluntary;
  donation conditions are unchanged.
- “Web search” became “Search the web · SearXNG”; “RSS reader” became
  “Read your feeds · FreshRSS”. Spanish uses literal task labels and voseo in
  explanatory text, including “Buscá” and “Seguí”.
- About now includes: “We like useful software. Knowing when to stop is a
  separate skill.” / “Nos gusta el software útil. Saber cuándo parar ya es otro
  asunto.” Sensitive notices and instructions have no added humour.

## Exact remaining limits

- WBO’s two landing punctuation edits are live in `utilibre-wbo:2.9.0-p3`.
  The rehearsed quiescence/startup gates preserved its native temporary history;
  public landing and drawing checks passed. Its normal ephemeral retention is
  unchanged. See [the scoped update](wbo-ram-update-2026-10-09.md). PairDrop’s
  bilingual return label was applied during a verified zero-client window.
- LRCLIB, TransLite and Chhoto now have equivalent EN/ES operator notes in their
  existing reviewed patches. TransLite’s later p3 provider clarification is also
  live and checked at1280px and390px; its parsers and selected endpoints are
  unchanged from the verified p2 build. Authentik uses its supported template directory for
  native verification/reset mail with voseo; six fictional renders passed and no
  messages were sent. Upstream application controls outside these operator-owned
  surfaces retain their native language support.
- Eight new applications lack a supported arbitrary catalog anchor in their
  installed configuration. Vikunja now uses its native OIDC Settings links in
  EN/ES, verified after public sign-in on desktop and mobile. The exact native
  sources and remaining eight limits are in `instance-navigation.md`.
- Provider/edge-log retention and mailbox provider/delegated access remain
  unverified. Those qualifications were retained. No new optimistic assurance
  was published and no incomplete legal identity passage was published.
- Physical-device tests, full offsite recovery and mail delivery/authentication remain scoped to their existing
  operational records. They are not claimed completed by the copy release.

## Native wording follow-up

At 03:04 UTC the newsletter web worker received the reviewed p2 copy build.
Its English/Spanish introduction explains server-stored messages and the private
feed link; native portal/privacy links have matching localized targets. The
absolute upstream tracking statement now distinguishes visitor analytics from
receipt logs and remote resources retained in feed entries. The upstream
application controls remain English, disclosed in the Spanish introduction.
A 375-pixel browser check over direct Caddy HTTPS passed, including native creation
and deletion of a new fictional feed, a subsequent 404 and no external requests.
The screenshot was visually reviewed. SMTP and jobs were not restarted, and no
mail was sent. See [deployment and rollback](newsletters-deployment-2026-10-09.md).

The operator confirmed both mail entry pages open externally. Newsletter launch
adds one reviewed catalog record and one EN/ES practical guide at
`/en/guides/newsletters-to-rss` and `/es/guias/boletines-a-rss`, using existing
catalog/guide/configuration mechanisms. The new wording follows the same voice
rules and voseo. It describes readable server storage, capability-link access,
30-day/size cleanup, separate attachments, no native history import, deletion
and unchanged same-VM backup retention without automatic expiry. At that earlier
newsletter release, Addy and SimpleLogin were outside the public catalog. The
later Addy forwarding/signing evidence and catalog/guide integration below
supersede its earlier forwarding blocker; SimpleLogin’s dependency blocker
remains.

## Native2 delivery and verification

Deployed `public-utility-portal:0.1.0-native2-20261009` on 9 October 2026. This release
contains 88 catalog records and 51 bilingual practical guides. The your-data
header now has a bounded reading width, paragraph spacing and a distinct review
note; its three reviewed introductory paragraphs retain their full wording.
EN/ES views passed at 320, 390 and 1280 pixels. The new guide is linked from the
export/deletion table and the shared guide index.

The build, typecheck and lint pass. The full 95-test unit run had 93 passes and two
stale catalog inventory expectations; after adding the new approved provider to
those expectations, the focused 28-test repeat passed. Both desktop and mobile
browser cases traversed all 51 guides in both languages and passed. The dev-server
watch limit initially prevented that browser suite from starting; its repeat
used polling in the test process only, with no host-limit or production change.
Twelve public EN/ES JS/no-JS checks passed for newsletter search, guide links and
the your-data layout. The public SEO audit passed all 132 canonical pages, and
the live status API includes the new newsletter observation among 77 endpoints.
The running portal is healthy. Private preview containers were removed.

Forty-eight recorded patches apply and reverse at their immutable pins. All
three refreshed public mail source archives matched their SHA-256 hashes and
per-file manifests. Native-source archives for LRCLIB, TransLite and Chhoto were
also downloaded and verified. The new Git-indexed source scan found no private
key/token material. Runtime state, operator credentials and backups remain
outside the source offer. Deployment evidence and the private rollback
environment are under `/opt/utilibre/reports/native-followup-20261009/`.

## Later additions, 9 October

The source inventory now also includes the EN/ES catalog and guide modules for
The One File Core, TiddlyWiki, Moocup, Rustpad, AutoRedact, Gravity, Knit, NewTon,
Kokoro Web and Family Chess. Their canonical files are the corresponding
`portal/src/catalog/*addition*.ts` and `portal/src/pages/*guide*.ts` modules,
including `standalone-*` and `knit-newton-*`. Disposition: authored and reviewed
with voseo, literal native control names, no em dashes and separate browser,
server, download and backup descriptions. Shared templates and protected notices
are retained. No CMS, translation service or runtime text replacement was added.

At the additions1 checkpoint, the first eight additions were live. All eight guides passed public
EN/ES390px checks with and without JavaScript (32 guide checks plus four catalog
checks). Kokoro's native public EN/ES audio workflow passed; its portal integration
followed in additions2. Family Chess's native EN/ES multiplayer/mobile workflow
first passed privately, then passed through the public edge before the
public-pilots release. Native UI translation limits
are stated beside each tool; a bilingual portal guide does not imply a fully
Spanish upstream interface. Dated deployment records identify exact native
welcome/footer fields and any small functional or privacy patches.

## Added account guides, 9 October

`catalog/donetick-addition.ts`, `catalog/beaverhabits-addition.ts` and their separate `pages/*-addition-guide.ts` are reviewed EN/ES voseo sources. Account access, share-link implications, native export omissions, token revocation, deletion and unchanged same-VM backup retention are explicit. Both were unavailable at the additions2 checkpoint; public account/workflow checks subsequently passed and their launch links are live. These modules feed the existing catalog, guide template, data index and software inventory.

Additions2 rendered verification passed for all 64 guides in both languages on desktop/mobile, then20 public localized views of the five new guide families with and without JavaScript. The pending-app notices keep the installed/private distinction. Beaver's native export warning also now includes equivalent Spanish voseo in 0.10.0-p7; its original controls and export scope are unchanged.

TRIP's separate `catalog/trip-addition.ts` and `pages/trip-guide.ts` are reviewed EN/ES voseo sources. Their restrained instructions distinguish authenticated PDFs from image capability links, owned ZIP contents from collaborators' files and external tile/search/routing/navigation/DNS providers from local processing. The later public rendering and account checks passed; the earlier private-only check is historical. The native app has no Spanish interface; that limit is explicit.

Final additions3 checks passed: all 65 guides in both languages through desktop/mobile tests, then the public TRIP guide, pending catalog card and your-data link with and without JavaScript at 390 px. All 160 canonical pages passed the metadata/language-link audit. There were no horizontal overflows, draft placeholders or page errors in these new public checks.

The later public-pilots and native-fixes releases supersede those temporary
pending launch notices. The catalog now has 102 records and 91 enabled entries;
the guide collection still has 65 bilingual guides. On 9 October, 36 additional
dated EN/ES verification notes replaced the generic untested fallback using the
linked native evidence, without extending its scope. Beaver's separate native
account recovery instructions were corrected. See
`copy-coverage-interface-2026-10-09.md` and `work-queue.md` for that follow-up.

## Addy integration and provider clarification follow-up

Addy’s new `portal/src/catalog/addy-addition.ts` and `portal/src/pages/addy-guide.ts` use equivalent EN/ES voseo copy. Existing catalog, search, account, export-guide and status mechanisms are reused. The guide distinguishes alias-record CSV from the custom-domain import template, states that an import round trip is untested, and preserves closed registration, separate native credentials, readable mail processing, quotas, deletion consequences and unchanged backup retention. It does not promise an email archive export or generic Utilibre/OpenID invitations. The precise application grant is `AGPL-3.0-or-later` from the pinned `composer.json`; the separate upstream Docker recipe is MIT.

Source integration passed typecheck, client/SSR build, scoped lint,47 focused unit tests, Compose validation and desktop/mobile EN/ES guide and account-view checks. A stale FMD test assertion was aligned with its existing verified export record while retaining the untested real-Android/push limitation; no FMD behavior changed. The host development watcher limit was avoided by testing the built production preview; no host limit changed, and the scoped preview was stopped. Evidence: `/opt/utilibre/reports/addy-portal-20261009.json`. Portal activation is the parent release step; this source check alone is not evidence of that deployment.

Operationally, the14:09UTC native forwarding test is owner-confirmed in Gmail with SPF/DKIM/DMARC passing. At14:32UTC the existing guarded Addy service had the native authentication-only Rspamd profile active, with loopback-only listeners, forged decision-header removal and temporary failure for unavailable authentication checks. That verifier is not a content classifier, analytics system or external scanning service. Seven isolated fictional cases passed; the later owner-confirmed native reply reached the original sender’s inbox through Addy and PMG. Existing Postfix Spamhaus client-IP/domain DNS checks remain separate from Rspamd’s disabled content classification. They send query metadata through the configured resolver, not mail bodies; their open-resolver warning and unverified provider retention are explicit. See [the dated deployment record](addy-deployment-2026-10-09.md#deployed-reply-authentication-1432-utc).

TransLite’s public p3 notice now names the actual translation recipients and endpoint-policy limits in both languages. Public desktop/mobile checks passed; the earlier p2 parser/translation verification remains applicable because p3 changed only the existing notice. The provider-copy check submitted no translation text. See [the privacy evidence](privacy.md#provider-policy-and-endpoint-review-9-october-2026).
