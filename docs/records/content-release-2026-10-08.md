# Content and configuration release — 8 October 2026

## Deployed result

The final portal follow-up, deployed on 9 October UTC, runs
`public-utility-portal:0.1.0-content-20261009`. Its prior content/readiness
images and private environment snapshots are retained for rollback.
Only the portal was recreated for this release. Serving limits, native app
accounts and existing data were preserved. The source link now downloads the
matching integration source, rather than pointing to an older repository tree.

- `/en/security`, `/es/security` and `/.well-known/security.txt` publish the
  existing mailbox and enabled private GitHub intake, hosted-instance scope,
  bounded good-faith policy and a checked expiry. Fifty-five intended HTTPS
  subdomains explicitly redirect discovery to the canonical file.
- `/en/your-data` and `/es/your-data` cover ten stateful applications with
  native export/deletion steps, formats, omissions, sharing implications,
  backup limits and precise performed/unperformed checks.
- Privacy, acceptable-use and transparency pages distinguish local files,
  browser persistence, ciphertext, readable server data, metadata, providers,
  Cloudflare HTTP proxying versus DNS-only use, and backup generations.
  Planned closure wording is conditional. Unresolved identity/legal drafting
  is not published as an operator notice or compliance certification.
- The catalog separates Best for / Ideal para from real limitations, removes
  PairDrop duplicate text, and uses only evidenced SPDX suffixes. Ambiguous
  grants are explicitly labelled without an invented licence grant.
- The homepage explains the privacy labels, has meaningful EN/ES taglines,
  and keeps task discovery first. Essential mobile navigation and keyboard
  access work before JavaScript; status/tool shells preserve navigation too.
- Seven bilingual native-workflow guides cover passwords/phrases, Markdown
  exports, syntax code sharing, EXIF viewing, file type/SHA-256 checking, Outlook
  wrapper decoding and basic PDF booklet preparation.
  Spanish uses voseo throughout the new copy.
- Native More tools links are live in PrivateBin and RSS-Bridge. PairDrop's
  existing portal link works; its clearer label waits for routine recreation.
- FMD's native normal and Android-embedded privacy views now have accurate
  EN/ES content and links. The pinned API binary and database schema are
  unchanged. The native web override and narrow gateway route are reversible.
- Active proxy frontends have scoped noindex directives; useful catalog and
  guide pages remain indexable. Caching was documented rather than removed.
- The status API now covers all 54 enabled services. Seven missing HTTP
  observations were added; Mumble reuses its existing, freshness-checked TCP
  listener monitor and still displays its catalog Degraded limitation. Both
  localized pages had zero Not checked rows at verification time. The three
  listed-only services remain not deployed. Checks are not full task tests.
- The Open with Utilibre guide uses `r/selfhosted` in both languages.
- Reactive Resume runs `6.0.0-p1`, with new public view/download statistics and
  identifier/deduplication disabled. Native sharing, editing and export remain
  available. Earlier aggregate counters may remain in storage and backups;
  real historical records were not deleted. Its reviewed patch and source
  archive are published, and the portal documents the change accurately.

Rallly was independently upgraded from the inspected affected 4.15.3 image to
4.15.4 after backup, with unchanged database schema and a benign preview check.
The two insecure static token generators were corrected to use WebCrypto and
verified publicly. Reload previously opened generators; replace passwords
created with the affected earlier generators. See their focused records.

## Principal files

Portal routing/rendering, bilingual copy, catalog and no-JS styles are under
`portal/src/`; static security discovery and its build gate are under
`portal/public/.well-known/` and `portal/scripts/`. The production renderer
check is `scripts/check-public-policies.mjs`.

Service and proxy changes use existing `deployment/community`, `deployment/pack`,
`deployment/toolbox` and `deployment/utilibre` conventions. Operational records
are consolidated in `work-queue.md`, `data-verification.md`, `privacy.md`,
`abuse-handling.md`, `security-discovery.md`, `license-review.md`,
`source-patches.md`, `capacity-2026-10-08.md` and `backups.md`.
No new visitor analytics, duplicate app, unified export backend or identity
system was introduced. Withdrawn Whisper remains withdrawn.

## Verification

- Portal build, typecheck and lint passed; 92 unit tests passed, including the
  fixed-target/freshness tests. The bilingual provider-path test was updated
  to assert the verified Cloudflare DNS-only distinction and passed again.
- The bilingual desktop/mobile run passed 61 cases directly. One keyboard
  case encountered a development-server restart; all four desktop/mobile
  keyboard and delayed-configuration cases passed in the isolated rerun.
  All practical guides, including the additions, were covered.
  The final seven-guide registry also passed all six desktop/mobile cases.
- Production EN/ES checks passed for policy/guide pages, ten service sections,
  no-JS search and keyboard navigation, delayed-JS hydration, horizontal layout,
  security.txt content type and expiry. Live links and localized defaults passed.
  After the final deployment, both status pages, all 54 live observations,
  Mumble's retained Degraded state, the two localized selfhosted examples,
  Outlook/booklet guide routes, sample PDF and Resume disclosure passed.
- FMD's four public normal/embedded EN/ES cases and nine linked endpoints passed.
  Synthetic API account isolation/deletion passed; fixtures were removed.
  Image/resource/readonly/schema comparison and SQLite integrity passed.
- Actual ZIP export/import preserved the fictional balance; FreshRSS OPML
  moved the test subscription between disposable accounts; native Wakapi CSV
  export/import moved one recent fictional heartbeat; CryptPad keys-only and
  content-download exports were distinguished through its native interface.
  The detailed record distinguishes these from source-reviewed operations.
- Fictional PrivateBin and Yopass records and temporary test accounts were
  deleted using native controls. No real user records were deleted.
- All 25 source patches passed apply/reverse reconstruction, including the
  restricted 13ft evaluation and the Resume privacy correction.
- Resume's scoped pre-change backup restored all 29 tables. Isolated tripwires
  verified that statistics identifier/deduplication paths were not reached;
  native JSON/PDF export, anonymous sharing and sharing-off denial passed with
  fictional data. Disposable records were removed and QA access was retired.
- CPU/RAM ceilings and bounded logging were inspected for all 101 live
  containers; this was not a new capacity benchmark. Earlier measured load and
  isolated restores remain documented with their limits.

## Exact remaining facts and dependent claims

- Detailed edge/security/system/provider logging retention and provider cache
  policy are not fully verified. No fixed duration or blanket no-logs claim is
  published. Both VMs sharing one physical Hetzner server in Germany is now
  owner-confirmed; operator establishment is not inferred from it.
- SMTP routing and operator-monitored inbox receipt are confirmed. The operator
  reports no explicit mail/backup expiry settings. Provider defaults, delegated
  access and actual deletion remain unverified; related guarantees stay
  unpublished. Private GitHub reporting is independently enabled.
- Complete CryptPad team/history/settings migration, older Wakapi heartbeat
  admission, LiberaForms attachment round trips, Penpot complete shared-library
  import, Reactive Resume full-account import, and real Android/FMD decrypted
  ZIP recovery are not claimed tested. Guides state the narrower verified scope.
- Thirteen upstream GNU version-scope suffixes and PairDrop's conflicting package
  declaration remain unconfirmed. Human-readable disclosures replace guessed
  SPDX precision; source and licence texts remain available.
- Operator legal identity, establishment and applicable duties need verified
  operator information and separate review. No residential address, invented
  entity, automatic German Impressum obligation or DSA certification is published.
- Offsite recovery remains operator-deferred; full-host recovery time is
  unmeasured. Existing same-VM backups do not prove disaster recovery.
- Earlier Galene WebSocket disconnects remain unexplained even though later
  bounded eight-meeting tests passed. Those measurements do not certify HD
  video or unlimited meetings.

New service proposals remain separate from this deployed release. Mail aliasing
needs existing mail/DNS administration and a tested delivery/recovery pilot.
Broad link utilities and 13ft require their specific privacy and network review.
Both later shortlists are reconciled with installed tools before further
deployment. RSS-Bridge, CyberChef, AudioMass, JupyterLite and RAWGraphs are
already installed. No additional app from those consideration lists was installed.
Awesome Selfhosted eligibility and submitted instance requests are recorded in
`public-instance-submissions.md`; no listing acceptance is claimed.

## Installation releases, 9 October

The additions3 portal image includes 102 catalog records and65 bilingual practical guides (160 canonical pages). The latest requested eight applications are installed: AutoRedact, Knit, NewTon, Gravity and Kokoro Web are public; Beaver Habit Tracker, Donetick and Family Chess have completed private native checks and await the separate edge. The earlier Projects and TRIP installations also await that edge. The portal shows maintenance notices for those five, with no active launch links. Existing Super Productivity, Moodist, Spliit and KitchenOwl were reused. Earlier Rustpad, One File Core, TiddlyWiki and Moocup additions remain public.

Catalog/configuration, guide registry, software-source inventory, your-data index, source offers, status-target allowlists and the existing work queue were updated. Privacy limits, native export/deletion scopes, Spanish voseo and unchanged backup retention are preserved. No visitor analytics, external messaging, custom export backend or duplicate service was added.

Verification:97 unit tests; all 65 EN/ES guides under desktop/mobile browser cases;160 public canonical/metadata/language-link checks;64 source-patch apply/reverse checks; public mobile/no-JavaScript checks of the new guide families and pending/available catalog states. Application workflow and exact restore evidence remain in each dated deployment record. These counts do not imply all apps have a Spanish native interface or a measured heavy-load capacity.

Remaining deployment action: merge `deployment/utilibre/edge/Caddyfile.october9-pilots` into the separate edge, reload and run the already-prepared public native checks before activation. Provider log retention, off-host recovery, previously documented physical-device/printing checks and native upstream customization limits remain explicit. Private rollback env snapshots and the previous running images were retained.
