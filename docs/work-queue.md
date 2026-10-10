# Operator work queue — reconciled 9 October 2026

## Later repair checkpoint — 9 October, 19:34 UTC

The later explicit Wallabag/Whisper repair request supersedes the historical
Whisper-withdrawal instructions recorded below only for its direct-URL pilot.
Whisper p7 is reachable at `https://transcribe.utilibre.org`; EN/ES synthetic
transcription checks passed, but the owner's Windows/Opera accuracy remains
unverified and the catalogue entry remains hidden. The later silent-recording
report received a microphone selector, native input meter, capture-filter changes
and a tested stereo-cancellation fix; simulated capture-to-Spanish-transcript
passes. The owner confirms much better capture, but reported low volume. P6
restores native automatic gain control explicitly: p5's echo-off setting had
implicitly disabled it in Chromium. The quiet synthetic recording comparison
and actual native-settings checks pass. The owner confirms louder capture but
reports humming. P7 adds optional browser-native noise reduction, initially off
to preserve the current capture mode, with a bilingual quiet/choppy-speech warning.
The synthetic comparison reduced hum and retained the sentence in both modes;
both misheard its greeting, so perfect recognition is not claimed. Windows/Opera
hum reduction with this optional switch remains for the owner to confirm.

Wallabag's pinned newer upstream source plus a two-file OTPHP security backport
is now packaged and deployed at `10.10.1.43:3177`, with native MFA/CSRF, account
isolation, actual article saving, exports, bounded egress and encrypted native
restore checks passed. Registration stays closed. The separate edge still
returns Cloudflare **525** for `wallabag.utilibre.org`: install the prepared block
in `deployment/pack/Caddyfile.pack`, verify real HTTPS login/assets, then publish
the account-service entry. Do not confuse a healthy backend with a public launch.
See `deployment/pack/wallabag/README.md` and the current `docs/service-pack.md`
checkpoint for exact versions, evidence, limitations and data-preserving rollback.

## Earlier consolidated queue

Consolidated from the operator's requests, including the English and Spanish
drafts. Draft assertions are requirements to verify, not evidence. Spanish copy
uses voseo. The 9 October instruction authorizes every eligible suggested app,
with concrete requirements-based exceptions. Finish installations and independent
verification first, then the catalog/SEO pass, then full copywriting. Reuse existing
apps where the requested capability is already delivered. Do not reopen completed
work without a new failure or changed scope.

| Work | State and next step |
| --- | --- |
| Additional requested batch, 9 October | Installed and publicly verified. Reuse installed Super Productivity, Moodist, Spliit and KitchenOwl. Rustpad, downloadable The One File Core, single-file TiddlyWiki and the tracking-free Moocup build are installed at the existing tools host; public native checks and source downloads passed. Their EN/ES catalog entries and guides are live in the additions1 release. TRIP1.50.1-p2 now passes public desktop/mobile native access and rendering, including a bounded real map check; matching source and public catalog entries are released. Bounded storage, approved-user access, provider notes and previously tested exports/recovery are retained. External maps are not described as local processing. Addy forwarding and PMG signing now pass the owner-confirmed inbox check; reply delivery is also owner-confirmed; Projects public access now passes. Those additions have EN/ES guides, evidence and catalog/SEO integration in the recorded releases. |
| Further explicit installation batch, 9 October | Installed and publicly verified. AutoRedact, Knit, NewTon and Gravity are installed with public native checks and source offers; their EN/ES catalog entries and guides are live. Family Chess is installed with resource/cleanup/backup controls; native two-player, spectator, live-update and mobile checks passed through the public Caddy edge. Beaver and Donetick native account, isolation, deletion and networkless restore checks passed; their public HTTPS account/workflow/desktop/mobile checks now pass; Kokoro is publicly installed; EN/ES speech generation, downloads, profile deletion and mobile checks passed with traceable rebuilt eSpeak source. Its catalog entry and EN/ES guide are live in additions2. Original scope: AutoRedact (browser OCR/local assets), Beaver Habit Tracker (normal accounts, no trusted-email bypass or analytics), Donetick (separate circles, no reset-link logs), Knit, NewTon (FOSS core only, no sharing API/proprietary directory), Gravity (local assets), Family Chess (session isolation, cleanup, bounded creation), and Kokoro Web (static browser inference, local licensed models/voices, no tracking/version/badge requests). Install each eligible application; earlier suggested priority/pilot order is not an exclusion. Every deployment needs pinned evidence, native checks, EN/ES voseo catalog/guide and source/recovery records. Do not activate Whisper or alter existing backup retention. |
| Galene repair, TURN and heavy workload test | Complete. See `capacity-2026-10-08.md`: four participants per group, four concurrent groups recommended initially; eight synthetic groups passed bounded UDP and TLS tests. Earlier signaling disconnects remain unexplained. Only the community group is provisioned. |
| Rallly critical RCE | Upgraded from 4.15.3 to digest-pinned 4.15.4. Running Next.js 16.3.8 verified, database schema unchanged, public login and benign preview passed. See `security.md`. |
| LibRedirect submission, after Galene | Seven additional GitHub instance requests submitted; DeGoog and RSS-Bridge were accepted. Redlib/SearXNG and five other requests remain under upstream review. LibRedirect has not refreshed these into its generated list. Codeberg/Gitfield authentication remains separate. See `public-instance-submissions.md`. |
| Straightforward account and invitation access | Delivered using native app access and the portal; see `account-access.md`. Preserve distinct FMD/LiberaForms/Galene accounts and existing FreshRSS closure. |
| Small, reproducible, removable source patches | Inventory and apply/reverse audit delivered; see `source-patches.md` and `deployment/source-patches.json`. Review again when updating affected upstreams. |
| Precise translation, notification, challenge and shared-link privacy | Reviewed against deployment and native flows; see `privacy.md`. Do not erase qualifications about edge retention, browser-delivered code or recipient copies. |
| Capacity and recovery | Measurements and isolated restore checks documented in `capacity-2026-10-08.md` and `backups.md`. Latest portal test: 2,000 requests, zero errors, visit p95 1,121 ms, above the 1-second soft target; this is not a fleet-wide capacity guarantee. Offsite backup remains operator-deferred; full-host recovery time is unmeasured. On 9 October the operator chose to keep all backup schedules/retention unchanged while arranging storage; about 14 GiB free was observed then; roughly 6 GiB remains during the current builds. Only disposable build files, inactive task-specific images and package-download caches have been removed; approximately 7 GiB remains after that cleanup. No backup deletion/expiry change is authorized by this review. |
| PairDrop repeated retention answer | Complete. Shared answer builder removes identical repeated paragraphs in both languages. |
| Best for / Limitation | Complete. Optional localized fields, separate Best for / Ideal para labels and verified constraints; no description/help fallback. Reviewed QR formats, Pollaris management access, draw.io export and Excalidraw collaboration. |
| No-JS and slow-JS navigation | Complete and live. Essential mobile navigation remains available before hydration, including status/tool shells; unavailable controls are hidden. Production EN/ES keyboard, no-JS and delayed-JS checks passed. |
| Precise SPDX identifiers | Complete where evidence supports precision. Ambiguous grants use explicit human descriptions, not guessed SPDX suffixes. Remaining upstream grant questions are listed in license-review.md. |
| Direct-instance navigation | Native More tools links; preserve each app identity, no tracking or forced redirects. See `instance-navigation.md`. |
| Awesome Selfhosted | Not eligible yet: no published Utilibre release; upstream requires the first release to be more than four months old. Contributions must be human-authored/submitted. No PR sent; see public-instance-submissions.md. |
| Empty taglines / positioning | Complete and live. Localized meaningful defaults and a measured data-transparency section below the task finder; no unsupported comparison with competitors. |
| Frontend reliability and rights posture | Complete and live. Bilingual interruption and substantiated-complaint wording; actual bounded caches documented rather than removed. |
| Frontend noindex | Complete on intended active frontend gateways, including LRCLIB. Public responses and crawler directives checked; Binternet verified through the edge because VM public hairpin fails. Catalog and guides remain indexable; noindex is not access control. |
| Private security disclosure | Root security.txt, EN/ES policy, expiry build check and contacts live. GitHub private reporting enabled; mail recipient route verified without sending. The earlier 55 HTTPS subdomain redirects were verified, including operator-applied imports. Public redirects from the five new stateful hosts were verified9 October against the root security contact. See security-discovery.md. |
| Anonymous-tool abuse and retention | Complete. Accurate native storage/deletion limits and private manual intake, acknowledgment/decision templates in abuse-handling.md. Inbox receipt/monitoring owner-confirmed; no explicit mail/backup expiry configured. Provider defaults and delegated access remain unverified. |
| Hosting jurisdiction and consolidated retention | Complete and live. Application and edge VMs share the same physical Hetzner host in Germany, owner-confirmed. Provider/edge retention remains explicitly unverified. Consolidated table uses catalog notes; no operator establishment inferred. |
| Leaving / shutdown / exports | Complete and live for ten stateful applications, including Reactive Resume and Penpot. Exact native scopes and performed/unperformed checks in your-data guides and data-verification.md. Planned closure is conditional; local browser storage/download persistence corrected. |
| Warranty / acceptable use | Complete and live. Bilingual plain service expectations and mandatory-rights caveat; unresolved operator identity/legal drafting remains unpublished. |
| Resource limits | The 8 October baseline covered 101 running containers. New service projects have explicit CPU/RAM/process/storage bounds in their dated deployment records. That historical count is not a claim about the expanded current fleet. No current heavy-capacity guarantee follows from idle limits. |
| Rate limits and abuse controls | Existing native SearXNG limiter, Redlib Anubis and per-tool gateway ceilings retained and documented. Normal workflows and bounded native rejection checks recorded in security/capacity notes. No indiscriminate new challenges. |
| Performance and observability | Complete. Existing caching and CPU worker fixes retained; operational logs bounded by size or discarded, aggregate resource monitoring uses no visitor analytics. Exact external retention remains unverified. |
| Email aliasing / temporary email | Newsletter ingestion is public and tested with the owner’s routed message. Addy native forwarding reached the owner’s Gmail inbox on 9 October, with SPF, DKIM and DMARC all passing; PMG signs using selector `pmg`. Its native reply-authentication repair is deployed and seven isolated Postfix/Rspamd cases pass, including forged headers and temporary DNS/scanner failure. The native reply was authenticated, returned through PMG and received in the monitored admin inbox, owner-confirmed. The local queue is empty. Public registration is closed and the verified owner alias is preserved. SMTP2526/2527 accept only10.10.1.20; all backup retention is unchanged. SimpleLogin p6 remains private because obsolete-framework findings require a maintained update. See the dated mail records. |
| Link tools | Complete and public/catalogued: browser-only URL Parameter Cleaner, Chhoto URL 7.8.3-p3 shortener with no click writes, and Unfurl 2026.10-p1 redirect/URL inspection with bounded outbound controls. Native tests, public flows and applicable isolated restore checks are recorded separately. Existing private opener/Outlook decoder retained for their different functions. See the dated deployment records. |
| Password / passphrase generator | Complete and live. Two insecure native token generators fixed with WebCrypto, sources published; seven-guide batch includes verified local password and BIP39 phrase routes. Reload old tabs and replace passwords made by affected old generators. |
| Markdown export / syntax paste | Complete and live using native HTML conversion, browser Print → Save as PDF, and PrivateBin syntax display. Fictional code paste created/read/deleted; no duplicate paste service. |
| EXIF inspection | Complete and live. Native Image Scrubber metadata viewer verified with fictional metadata. CyberChef Extract EXIF remains blocked by strict CSP and is not recommended. |
| File inspection / hash verification | Complete and live. Native CyberChef file-type/SHA-256 guide checked with exact fictional bytes; limitations of hashes stated. |
| 13ft | Complete and public/catalogued at read.utilibre.org, 0.5.0-public1. Public fictional native POST/EN/ES browser checks, restricted outbound proxy/namespace/DNS/private-address controls and bounded HTML rendering passed. No redirect/login/JavaScript/archive fallback or persistent article cache. The 8 October fixture-only pilot is historical; see 13ft-deployment-2026-10-09.md. |
| Open with Utilibre example | Complete and live: r/selfhosted in both English and Spanish, verified on public guide pages. |
| Status coverage | Additions2 public check on9 October returned 86 observations, covering all 86 enabled entries, including the five newly public browser tools. Kokoro's missing exact-target allowance was corrected;10 targeted status tests passed. The public-pilots release enables Family Chess, Donetick, Beaver, Projects and TRIP, for91 enabled entries. Beaver’s native root307 points to /login; the bounded public probe now checks that exact200 login page instead of misreporting the normal redirect. Known unavailable/degraded catalog qualifications remain separate from HTTP/TCP observations. These checks do not establish complete workflows or voice quality. |
| Reactive Resume visitor counters | Corrected live in 6.0.0-p1. Identifier/deduplication and new view/download statistics disabled; native sharing/export and scoped restore passed. Historical real records preserved; portal disclosure and source link live. See reactive-resume-privacy-2026-10-08.md. |
| Install every eligible suggestion — 9 October override | The preceding batch delivered 23 public additions, including Razzia/Chhoto/Unfurl/13ft and the newsletter receiver, with bilingual guides and recorded native checks/restore scope. The newly requested batch above is installed and publicly checked; access restrictions remain documented. Addy forwarding/signing now pass; the native reply also reached the monitored inbox, and SimpleLogin p6 retains a framework-security blocker; PLANKA and ZipCaptions have evidenced requirements exclusions. The maintained FOSS Projects alternative passed public native account, isolation, file-sharing and desktop/mobile checks. Current checklist: service-candidates-2026-10-08.md. |
| PrivateBin Google description and favicon | Fixed and publicly verified9 October. Exact empty homepage has EN/ES title, description, visible introduction, canonical and Utilibre icons; paste/query/error URLs retain noindex and crawler exclusions. Native fictional encryption/decryption/deletion and desktop/mobile checks passed. Container image, encryption, storage, expiry and backup retention are unchanged. Small native-template patch applies/reverses; see `privatebin-discovery-2026-10-09.md`. Google recrawling/display is external and has not been claimed complete. |
| TRIP rendering check, requested after current work | Fixed after completing PrivateBin and the Caddy handoff. Native Angular inlineCritical=false keeps the stylesheet working under the existing strict CSP. Public native MFA/account, desktop/mobile map/settings/reload and service-worker update checks passed; saved preferences were preserved. Source and portal release integration are complete. |
| Caddy blocks for recent installations | Complete handoff: 24 unique service-host blocks in `deployment/utilibre/edge/Caddyfile.recent-services`, plus the existing five-host pending fragment. Core syntax passed in a stock-Caddy harness. Standalone public downloads were withdrawn after the owner questioned their exposure; hand off in chat/from the repository. After the handoff, all five public routes began responding: chess3214, chores3215, habits3216, projects3217 and trip3224. The 11:41 check returned native pages or the normal habits redirect; earlier525 responses are historical. All five public workflow checks have passed; portal launch links are live. Browser tools use the existing tools3103 route. |
| Final catalog and SEO update | The additions3 release is live with 102 catalog records, 65 bilingual practical guides and 160 canonical pages. Kokoro, Family Chess, Donetick, Beaver, Projects and TRIP are enabled with launch controls after public workflow checks. The public-pilots release retains102 records,65 bilingual guides and160 canonical pages. All 160 public SEO checks, 97 unit tests and six guide/browser cases passed. Newly requested account services are integrated only after their native checks. Live full metadata/canonical/hreflang/structured-data/initial-guide-link audit passes; every enabled tool has a public catalog launch and software-inventory mention. Stale audit path list/size ceiling corrected using the existing registry, with 21 relevant tests passing. All 22 addition entry pages pass noindex; three gateway robots corrections are deployed. The operator purged only the bookmarks robots URL; its canonical response and protected API were verified at 03:02 UTC on 9 October. See seo-catalog-2026-10-09.md. No analytics, external submission or ranking promise. |
| Sitewide voice/copy implementation | Complete for accessible canonical sources and deployed in copy1 on 9 October. Reviewed all 87 catalog records (29 updated), all 50 guides (32 updated), 324 EN/ES dictionary keys and supported native notices. Voseo, factual boundaries, literal controls and sensitive commitments retained; optional personality added on Home/About/Support. Build/lint/typecheck and 95 unit tests pass; all 74 browser cases pass across the full run and six corrected-label rechecks. Public 130-page SEO audit and EN/ES no-JS navigation pass. The native2 follow-up deployed the your-data intro layout fix without changing reviewed wording, and Authentik EN/ES email templates, PairDrop’s bilingual return label, and LRCLIB/TransLite/Chhoto/newsletter notes. Vikunja Settings and Rallly footers now have native EN/ES catalog links; Donetick wording and scoped account-session deletion are repaired. WBO p3 landing punctuation is live after verified temporary-state preservation; unsupported native navigation/languages and provider facts remain documented in copy-coverage-2026-10-09.md. No tracking, dependency or custom writing backend added. |
| Copywriting style supplement | Part of the later voice task, not a new priority. Apply the 9 October supplement to all new copy: plain concrete verbs and nouns; varied sentence/paragraph/section rhythm where useful; no em dashes, empty announcements, generic authority claims, canned reassurance, repeated abstract contrasts or self-congratulatory closers. Read the assembled page once for repeated patterns. Apply selectively rather than enforcing sentence lengths, rare words, asides or emotion quotas. Preserve meaning, factual qualifications, consistent technical terminology, literal UI/actions and approved policy text; do not invent experiences, evidence, uncertainty or mistakes to simulate a human author. Spanish remains voseo under the owner's explicit standing instruction. |

Do not reactivate the withdrawn Whisper tool or submit known-broken frontends. A 9 October reconciliation found its old direct host still serving the app; the origin was replaced with a 410 withdrawal notice and old app assets were blocked. Historical source remains available.
Public listing acceptance, physical Android tests, remote-edge changes and
offsite disaster recovery must remain explicitly distinguished from local work.

The correction addendum overrides earlier queued drafts; the operator’s later
Spanish instruction overrides its tú wording: always use voseo. Unknown facts
leave only dependent claims pending, never the whole implementation.

## Public rendering follow-up, 9 October

Links: Chhoto7.8.3-p3 is deployed. Both CSS files had loaded, but the bilingual instance notes inherited absolute toolbar positioning and overlapped the form. The small separate layout patch places them below the form with responsive spacing and a versioned CSS URL. Actual public Chromium checks passed at1280,390 and320px, light/dark themes, native login dialog, fictional Shorten/clipboard/307 redirect and exact native deletion404. No outside assets or browser errors. The prior image, database backup and source archive are retained; expiry and backup retention are unchanged. Evidence: `chhoto-deployment-2026-10-09.md` and `/opt/utilibre/reports/chhoto-rendering-20261009`.

Public-pilots verification: portal build,97 unit tests, all six desktop/mobile guide cases and160 public canonical-page checks passed. A focused12-test status suite also covers Beaver’s exact login probe and rejects arbitrary substituted paths. The public EN desktop/ES mobile catalog has all five new launch links, with no overflow or page errors. Security-contact redirects pass on all five hosts. A test-run development watcher exhausted inotify and a simultaneous Docker build interrupted browser connections; the completed guide run used polling and two browser workers after the image build. These test-harness incidents required no production setting change. Matching rollback environment/compose and the old portal image are preserved. Remaining owner-controlled mail/signing, off-host storage and provider-retention checks are unchanged.

Final public release check: all91 enabled entries have status observations, and each of the five newly activated services reports operational. This is a readiness observation; separate native workflow evidence is linked above. The release image is `public-utility-portal:0.1.0-public-pilots-r2-20261009`; its reviewed integration source uses revision `20261009-public-pilots-final`.

## Completion follow-up, 9 October

- **PrivateBin:** operator-applied deferred HSTS/nosniff headers now pass publicly. Observatory scan126795844 returned A+,150/100, all12 checks passed. Native fictional create/decrypt/unkeyed/deletion flow passed after the change; file uploads remain disabled. See `privatebin-discovery-2026-10-09.md`.
- **DeGoog:** Settings404 and sparse web search are repaired. Four native engines now separate Web, Books and IT; public desktop/mobile, Spanish results, no-JavaScript form, proxied thumbnails and saved preferences passed. Google CSE involvement and bounded cache durations are disclosed in both languages. See `degoog-search-2026-10-09.md`.
- **Native navigation and wording:** Vikunja Settings and Rallly footers now offer both catalog links through supported controls. Donetick p3 fixes the empty-state copy and native account-session deletion. Eight other apps have verified native customization limits; they are not waiting for an unperformed settings check.
- **FreshRSS recovery:** a retained database/files snapshot restored in isolation, with native browser login and the fictional feed/article listing visible in6.1s. This is an operator restore check, not a full-host recovery or article-export migration claim.
- **Mumble:** external run37933469692 passed a pinned/authenticated encrypted UDP silence loopback without TCP fallback. The operator-added temporary Actions secret can now be removed; current API permission does not allow secret management. See `mumble-udp-verification-2026-10-09.md`.
- **BreezeWiki:** native tabs are repaired. Image requests still receive upstream403. Rimgo's checked video receives429; neither is a stale cached failure. LibreMDB private search/images pass, but permission covering the selected data endpoint's public use is unverified. See `frontend-reliability-2026-10-09.md`.
- **SimpleLogin:** p7 retains the p6 fixes and adds 33 hash-pinned runtime package updates; native token/PGP, CORS, auth/CSV/SMTP/restore/delete checks pass. The remaining legacy-framework findings keep it private.
- **Shortener assessment:** Kutt's native account-link creation queues visitor analytics without a global disable in the reviewed source. It does not meet the current rule. Chhoto remains publicly functional; no duplicate service or link migration was performed. See `chhoto-kutt-review-2026-10-09.md`.
- **WBO:** completed in p3. The scoped memory-based update preserved the existing board exactly; public EN/ES, two-session drawing/reconnect/export and fixture-cleanup checks passed. The matching source is public. See `wbo-ram-update-2026-10-09.md`.
- **Scheduled backups:** the actual Donetick unit completed with integrity/foreign-key checks after its earlier p3 fix. Spliit's unit pointed to a nonexistent Node path; the scoped correction passed a scheduled run and disconnected PostgreSQL restore. No failed systemd units remained after those runs. Both schedules and every retained backup are unchanged.
- **Public native checks:** Spliit and linkding now pass their full fictional create/export/delete workflows through the public edge; linkding also passed native import and exact checked-field recovery. Fixtures were removed and linkding's test identity retired. Spliit's outside flag-image attempts are blocked by CSP, not hidden from the evidence.
- **Reactive Resume account export:** the installed p1 image passed native account ZIP download and extracted-resume JSON import into an independent fictional account, content/design comparison, private sharing after import, edit/reload, access denial and native account deletion. Both isolated accounts/containers and the temporary network/relay were removed. Whole-account migration, letters, nonempty job applications and image bytes remain outside this bounded check. See `reactive-resume-account-export-2026-10-09.md`.
- **Penpot export/import:** the exact installed images passed a basic editable design archive round trip into an independent fictional account, browser edit/save/reload, account-access denial and native deletion. The temporary stack was removed. Team/library/image/font/history migration is not claimed. See `penpot-roundtrip-2026-10-09.md`.
- **FMD export:** native browser decryption, ZIP locations/image/metadata and scoped deletion now pass with fictional encrypted data. The four-expression p2 CSV fix preserves legitimate zero values; nonzero and absent-field checks also pass. Native EN/ES privacy wording is corrected, the matching source is public, and rollback data/assets are retained. No Android/push/account-ZIP-import claim is made. See `fmd-export-verification-2026-10-09.md`.
- **Source and portal:** the earlier native-fixes r3 release passed all160 public SEO checks. The subsequent queue-verified release includes the FMD p2 description, Penpot/FMD export results and36 additional dated task checks in both languages. Build, typecheck, lint,98 unit tests and the69-patch apply/reverse audit pass. Public desktop/mobile checks with and without JavaScript verify all38 changed task notes and both export sections, with no overflow, page errors or outside browser requests. No-JS search/keyboard navigation, delayed-JS hydration, policy pages and security.txt pass separately. That release used image `public-utility-portal:0.1.0-queue-verified-20261009` and integration source revision `20261009-queue-verified-final`; the later mail/provider release below supersedes it. Matching Spliit, FMD and Dumb public archives were hash-checked. The old image, environment, Compose file and source archives are retained for rollback. Evidence: `/opt/utilibre/reports/queue-completion-20261009/queue-public-rendered.json`, `queue-source-public.json` and `portal-queue-release.json`. A12:55 running-container check found CPU/RAM/process ceilings on all162 containers observed, including temporary verification containers; this is configuration evidence, not measured fleet capacity.

## Mail/provider release, 9 October

The `public-utility-portal:0.1.0-mail-provider-20261009` release adds the verified Addy service and bilingual native guide, precise translation/DNS/provider disclosures and pinned licence evidence. It also records Reactive Resume’s scoped account ZIP/import check. It serves92 enabled services and162 canonical pages. Build, typecheck, lint,99 unit tests, public EN/ES desktop/mobile notes, all162 SEO pages,92 readiness observations and no-JS/security checks pass. Addy’s native authentication-only configuration passed seven isolated cases and live loopback/SMTP-guard checks; the owner confirms both ends of the mail round trip. TransLitep3 bilingual provider notes are live. Public Addy, TransLite and integration source downloads match local hashes; Addy’s896 manifest files also match. Source revision: `20261009-mail-provider-final`. Evidence: `/opt/utilibre/reports/addy-forward-20261009/portal-release.json`, `completed-roundtrip.json` and `public-source-verification.json`. Existing images/configuration and backups are retained for recovery.

## Remaining dependencies and work in progress

- **Dumb repair:** the private f558107-p1 candidate fixes false-success/error caching, bounds the native cache to32MiB, and includes two upstream rendering corrections. Native offline regressions and loopback tests pass. The owner-supplied IPv6 address now has verified external connectivity; its Netplan configuration and tested VM-level firewall are installed persistently, with IPv4 unchanged. Genius search and lyrics still return403 anti-bot challenges over IPv6, as over the checked IPv4 path. A usable authorized Genius retrieval path or compatible upstream correction remains required before public activation. This does not prove an IP-only cause or universal failure. See `dumb-ipv6-readiness-2026-10-09.md`. The same upstream revision works on a checked public instance. Public LRCLIB remains available; the loopback-only native PROXY recipe is in `dumb-repair-2026-10-09.md`.
- **Alias mail:** native forwarding and the received message’s SPF/DKIM/DMARC passed the authorized test. Reply authentication is deployed with isolated positive/negative tests and live guard checks. The owner’s reply was authenticated and returned through PMG to the monitored admin inbox; receipt is confirmed and the local queue is empty. No duplicate message was sent.
- **Storage/recovery:** the owner is arranging disk space. All backup schedules/retention remain unchanged. Off-host backup destination/access, full-host recovery timing, physical Android/FMD checks and a folded Bookbinder print still require their respective infrastructure or equipment.
- **Facts:** exact edge/provider and mailbox/delegated-access retention, unresolved licence grants and unpublished operator/legal identity remain narrow factual dependencies. They must not become invented public assurances.
- **Discovery:** the existing upstream requests are monitored; Codeberg/Gitfield need separate access. Awesome Selfhosted requires a qualifying release age and human contribution. PrivateBin search metadata/icons are fixed; Google controls its refresh. No duplicate requests were sent.

PLANKA and ZipCaptions remain evidenced requirements exclusions; Whisper is withdrawn. Unsupported native link settings, third-party review and physical tests are distinguished from deployment work that can be completed on this VM.

## Export and deletion follow-up, 9 October

The additional native checks are recorded in `freshrss-article-export-2026-10-09.md`,
`rallly-csv-export-2026-10-09.md`, `wishlist-image-claims-2026-10-09.md` and
`liberaforms-export-formats-2026-10-09.md`. FreshRSS JSON/ZIP preserves the checked
article content/state but the web feed selection stops at 50; a larger native
operator export was checked separately. Rallly's organizer CSV preserves the
checked participant/time/vote columns and is not a complete poll import archive.
Wishlist's direct item deletion removes its image, but group deletion can leave
that image accessible. A second fictional member's reserve/purchase/unclaim and
delete-denial checks pass. LiberaForms' native browser export component passes
CSV/JSON/PDF reopening with fictional post-decryption table data, separately from
its earlier encryption and restore checks; this instance disables attachments.

EN/ES guides preserve these limits, use voseo and make no complete-account
migration promise. All new checks use isolated fictional state; no production
records, mail recipients, service settings or backup retention were changed.

CryptPad's isolated native personal/team export check also passed. Keys JSON has
no document bodies; the personal ZIP contains the tested Markdown, Rich Text HTML
and uploaded text file but omits the team document. The separate owner team ZIP
contains that document. HTML reopening and Markdown import into a second account
with reload passed. No complete drive/account, history or permission migration is
claimed. See `cryptpad-drive-export-2026-10-09.md`.

The export-guide release uses `public-utility-portal:0.1.0-data-fidelity-20261009`
and corresponding integration revision `20261009-data-fidelity-final`.
Its production build, typecheck, lint and 99 unit tests pass. Deployment and
public EN/ES desktop/mobile acceptance results are recorded separately under
`/opt/utilibre/reports/data-fidelity-20261009/`; source hash verification belongs
with that release evidence. The previous image, environment, Compose file and
source archive are retained for rollback. Service settings and retention remain
unchanged.

## Upstream/security/provider follow-up, 9 October

The user requested another repair pass. SimpleLogin p7 is now deployed privately:
33 hash-pinned runtime package changes and nine dependency declarations reduce
the inventory from 129 advisory groups across 26 packages to 30 groups across
eight. Native cryptographic and authentication checks, CSV, SMTP handshake,
backup/restore and prior-image schema compatibility pass. Flask/Jinja/Werkzeug
and five development/build/interactive packages remain flagged; public activation
is still blocked. No schema, provider or retention change.

Fresh reader checks preserve the distinction between local defects and upstream
refusal: Rimgo media returns 429 and BreezeWiki media returns a 403 challenge.
Those selected hostnames have no AAAA record; the working VM IPv6 route cannot
change their destination. Dumb's tested IPv6 requests remain challenged. Their
current upstream revisions match the installed pins. LibreMDB still needs
verified permission for its selected public data use. Existing local repairs
remain deployed or ready in private candidates. See the respective reader
records; no rotating proxy, external-instance relay or new provider was added.

Provider/licence evidence and public source publication are reconciled in
`license-review.md`, `privacy.md` and the matching release receipt. Exact denied
Cloudflare configuration checks remain distinct from verified DNS settings.

Four declared package licences now use precise SPDX identifiers: AutoRedact
GPL-3.0-only; FreshRSS, La Suite Projects and internal RSSHub AGPL-3.0-only.
Original component notices are preserved. The five contradictory ISC/MIT fields
and the other non-SPDX/absent declaration cases remain explicitly documented.
Cloudflare's token is active, but settings/rules/logging/analytics checks return
403; precise read permissions and a sanitized Caddy inspection command are in
`privacy.md`. Neither denied configuration access nor DNS-only evidence proves
provider log retention. The owner has been asked for the required read access.

The corresponding portal release is `public-utility-portal:0.1.0-upstream-facts-20261009`,
with integration revision `20261009-upstream-facts-final`. Build, typecheck, lint
and 99 unit tests pass; publication and public acceptance evidence belongs in
`/opt/utilibre/reports/upstream-facts-20261009/`. Previous images/configuration and
source archives are retained. No visitor tracking, new provider, external
message, real user-data deletion or backup-retention change was introduced.
