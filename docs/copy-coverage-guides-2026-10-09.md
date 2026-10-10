# Guide copy coverage, 9 October 2026

Scope: read every field of all 50 practical guides in English and Spanish, the complete PDF/OCR and QR references, the guide renderer/index, and all ten detailed service sections and shared retention paragraphs on Your Data. Spanish uses voseo throughout. This was an editorial pass; no service configuration, retention, native controls, permissions, test fixtures in service databases, or operational state changed.

The practical-guide comparison against the pre-edit snapshot confirms all 50 IDs, routes, tool targets, sample filenames, section structure and step counts are unchanged. Every practical guide's privacy paragraph is byte-for-byte unchanged. Export omissions, actual test scope, provider roles, record ceilings and failure limits remain explicit. Both languages were reviewed, including guides retained because their existing copy was already concrete.

## Practical guides

“Updated” identifies the exact fields changed. Unlisted fields were retained. “Retained” means the entire EN/ES entry was read and kept, not skipped.

| ID | Result | Fields or reason |
| --- | --- | --- |
| `drawdb` | Retained | Clear existing copy; factual instructions and limits retained. |
| `bookbinder` | Updated | en.intro, es.intro, es.steps |
| `sketchforge` | Updated | en.intro, es.intro |
| `moodist` | Updated | en.intro, es.intro |
| `chartdb` | Retained | Clear existing copy; factual instructions and limits retained. |
| `shared-expenses` | Updated | es.steps |
| `gift-wishlist` | Updated | en.intro, es.intro, es.steps |
| `household-recipes` | Updated | en.intro, es.intro |
| `opengist` | Updated | en.intro, es.intro |
| `linkding` | Updated | en.intro, es.intro, es.prerequisites |
| `vikunja` | Updated | en.intro, es.intro |
| `bytestash` | Updated | en.intro, es.intro |
| `openresume` | Updated | en.intro, es.intro, es.steps |
| `calendar-contacts` | Updated | en.intro, es.intro |
| `chitchatter` | Retained | Clear existing copy; factual instructions and limits retained. |
| `link-cleaner` | Updated | es.steps |
| `gathio` | Updated | en.intro, es.intro, es.next |
| `razzia` | Retained | Clear existing copy; factual instructions and limits retained. |
| `chhoto` | Updated | en.success, es.success |
| `unfurl` | Retained | Clear existing copy; factual instructions and limits retained. |
| `public-page-reader` | Updated | en.intro, es.intro |
| `passwords` | Retained | Clear existing copy; factual instructions and limits retained. |
| `markdown-export` | Updated | en.intro, es.intro |
| `share-code` | Updated | en.intro, es.intro |
| `inspect-photo` | Updated | en.intro, es.intro |
| `file-verify` | Updated | en.intro, es.intro |
| `outlook-link` | Updated | en.intro, es.intro |
| `booklet` | Updated | en.intro, es.intro |
| `shared-board` | Retained | Clear existing copy; factual instructions and limits retained. |
| `my-utilibre` | Updated | en.prerequisites |
| `open-with` | Updated | es.troubleshooting |
| `starting-projects` | Retained | Clear existing copy; factual instructions and limits retained. |
| `private-document` | Updated | es.steps |
| `shared-budget` | Retained | Clear existing copy; factual instructions and limits retained. |
| `community-plan` | Updated | en.intro, es.intro |
| `private-form` | Retained | Clear existing copy; factual instructions and limits retained. |
| `shared-presentation` | Retained | Clear existing copy; factual instructions and limits retained. |
| `collaborative-outline` | Updated | en.intro, es.intro |
| `small-meeting` | Updated | en.intro, es.intro |
| `local-week` | Retained | Clear existing copy; factual instructions and limits retained. |
| `feed-packs` | Updated | en.next, es.next |
| `map-data` | Updated | es.next |
| `unit-calculations` | Retained | Clear existing copy; factual instructions and limits retained. |
| `mindmap` | Retained | Clear existing copy; factual instructions and limits retained. |
| `scan` | Retained | Clear existing copy; factual instructions and limits retained. |
| `image` | Updated | en.intro |
| `photo` | Updated | en.success |
| `poll` | Retained | Clear existing copy; factual instructions and limits retained. |
| `chart` | Retained | Clear existing copy; factual instructions and limits retained. |
| `transfer` | Retained | Clear existing copy; factual instructions and limits retained. |

## Reference pages and export/deletion procedures

| Page or section | Result |
| --- | --- |
| Practical guide index/renderer | Kept index introductions and structure; clearer English explanation of literal native control labels; colon replaces unavailable-tool em dash. |
| PDF/OCR reference | Clearer task-first introduction; Spanish voseo correction; removed stale jsDelivr/githack runtime claim. The existing air-gap deployment serves components, English/Spanish data and fonts from Utilibre, with Cloudflare delivering application assets. File contents remain processed in the browser in these workflows. |
| QR reference | Voseo `podás` in title; read and retained format, camera, password, static-code and physical-testing limits. |
| Your Data introduction | Added a short EN/ES instruction to select the service, save needed data and check the download before deletion. Required export-scope/protection paragraph unchanged. |
| Reactive Resume | Read EN/ES; retained account ZIP vs individual JSON/PDF, image omissions, earlier counters, native deletion and unperformed full-account migration. |
| Penpot | Read EN/ES; retained library choices, export omissions, licensed fonts, team implications and unperformed complete import. |
| FreshRSS | Read EN/ES; retained OPML vs article JSON/state, native account deletion and tested OPML-only round trip. |
| CryptPad | Read EN/ES; retained keys-only Backup vs Download my CryptDrive, native destruction/account distinction, 90+15/365-day settings and limited test scope. |
| Actual Budget | Read EN/ES; retained compatible release ZIP import, sensitive plaintext export, deletion scopes and tested 123.45 fixture. |
| Wakapi | Read EN/ES; retained script/API CSV method, private key handling, three-month cleanup, pandas compatibility and recent-heartbeat-only import test. |
| Rallly | Read EN/ES; retained actual CSV fields, account restrictions, no CSV restoration and source-checked controls. |
| Pollaris | Read EN/ES; retained public CSV access, bearer management link and native fictional deletion evidence. |
| LiberaForms | Read EN/ES; retained separate attachments/keys, export omissions, encrypted answers and unperformed attachment round trip. |
| FMD | Read EN/ES; retained 300-location/5-picture caps, Cloudflare/OSM/push roles, decrypted ZIP scope and untested real Android recovery. |
| Your Data shared retention/closure | Read EN/ES; retained seven daily/four weekly FreshRSS generations; no automatic expiry for the other named backups; same-VM, encryption and off-host-recovery limitations; planned/unexpected closure wording unchanged. |
| Your Data links to newer services | All twelve existing service links retained, with their native guide permissions/export/deletion limits. |

## Text examples

Removed authored em dashes from the two form-question files, the two weekly-plan files and `transfer-example.txt`. Updated its canonical generator in `portal/scripts/build-practice-examples.mjs`. Translated only the Spanish calendar DESCRIPTION in `community-es.ics` and its canonical generator `deployment/pack/prepare-examples.mjs`; preserved UID, timestamps, timezone, machine PRODID and CRLF endings. The new DESCRIPTION is 74 UTF-8 bytes, below the 75-octet folding threshold. No PDF, JPEG, DOCX, XLSX or other binary fixture was regenerated. A bounded source search found no separate generator for the manually authored form-question/weekly-plan files.

The text sample bytes changed intentionally; any earlier byte-identical transfer observation describes the earlier test sample. There are no fixed checksums for these six files in the existing guide checks. Current sample SHA-256 values:

| Sample | SHA-256 |
| --- | --- |
| `form-questions-en.txt` | `54465dd9542b123a572a5f8a64c6876371cc255c017f7536f7c25eda625d40f2` |
| `form-questions-es.txt` | `afce0fd06220fd2aca3a00aabc423bf99b4fa0a8b8e23c714e124ea55fe0262b` |
| `week-plan-en.txt` | `6337547523f6abfdfcee9785e67a8e32949c2198f032d89057994a0bec3343a3` |
| `week-plan-es.txt` | `be96d33f53f2eaa67f51787e43b5d5706bf6744c34395004ab26d82131ad92a3` |
| `transfer-example.txt` | `d92e1ff51c54e4eb46248d4a4afc27825b56ea3dac337a8a9ffa1e7921bf9777` |
| `community-es.ics` | `d4c26d711d913180d06786adb926928a24b18d8a5aeb4d929d74a47dd564c1f0` |

## Evidence and checks

- Provider correction: `deployment/toolbox/build-bentopdf.mjs` sets `VITE_USE_CDN=false` and same-host WASM/OCR/font URLs; `prepare-bentopdf-airgap.mjs` supplies pinned eng/spa language data, worker/core and fonts. This replaces an obsolete public statement; it does not disable useful caching or change providers.
- TypeScript check passed after edits.
- Focused ESLint check passed for all `src/pages/*guide*.ts` files and `your-data.ts`.
- Normalized before/after registry comparison passed: 50 stable entries, 32 with targeted text changes and 18 retained; unchanged privacy paragraphs, targets and step counts. Private snapshots are under `/opt/utilibre/reports/copy-guides-20261009/`.
- No authored em dashes or searched tuteo forms remain in the owned guide/data-page source. Exact native labels remain as installed.
- Existing focused desktop/mobile browser checks passed: 8 tests in 55.2 seconds, covering the complete 50-guide EN/ES registry, launch destinations, downloads, language switches, print/mobile layout, account/pilot views, and PDF/QR references. The two complete-registry cases took 44.3 and 41.3 seconds within their existing 60-second budgets. Initial startup hit the VM file-watcher limit before any test ran; `CHOKIDAR_USEPOLLING=1` was used only for the successful test process. No system limit or production setting changed.
- Both edited sample generators pass `node --check`. No binary fixtures were regenerated.

No new service capability or unperformed recovery is asserted by this copy pass. Remaining operational prerequisites belong to the existing service records; no retention schedule was shortened or backup removed.

## Newsletter follow-up

`portal/src/pages/newsletters-guide.ts` adds the newsletter guide in EN/ES after
the operator confirmed outside-browser access. Both variants were reviewed in
full: native labels, private feed/settings links, Atom export omissions, separate
attachment downloads, reader-dependent import, native deletion, cleanup and
backup retention remain explicit. Voseo is used; no unsupported reader import or
mail delivery guarantee is introduced. Source review completed; rendered checks
are recorded with the parent native2 release.
