# Capability expansion and precise dependencies — reconciled 9 October 2026

The operator's 9 October instruction is to install every eligible suggestion, not
stop at a review or choose only one of distinct applications. The current complete
installation checklist is [service-candidates-2026-10-08.md](service-candidates-2026-10-08.md).
This document preserves the capability distinctions and exact mail/link dependencies.
The installation, catalog/SEO and full copy phases have been delivered; the work queue records subsequent repairs and exact unresolved dependencies.
Spanish remains voseo; no Whisper activation or duplicate copy of an existing app.

## Native capabilities already delivered

- Password/token generation: existing generators now use WebCrypto with unbiased
  selection; older output is not retroactively made stronger. Reload the app and
  replace any password created by the affected old generator. IT Tools has a
  separate native word-phrase tool; its verification is recorded with the guides.
- Markdown: native HTML conversion and BentoPDF's Markdown preview/print path.
  Browser Print → Save as PDF depends on the browser and operating system.
- Code sharing: PrivateBin already supports syntax formatting. Keep encryption,
  expiry and deletion semantics. The now-installed Opengist and ByteStash fill
  the separately requested persistent Git/library workflows; they do not replace
  PrivateBin or justify changing its retention.
- EXIF: Image Scrubber exposes metadata before edits. A metadata view is not a
  guarantee that every embedded object or identifier has been found.
- File hashes/inspection: existing local CyberChef operations. A digest checks
  equality against a trusted expected value; it does not establish authorship,
  safety or authenticity on its own.

## Mail services and remaining native delivery checks

All three applications have isolated native test records. Kill the Newsletter!
is public and catalogued; the owner confirmed routed SMTP ingestion and browser
access. Addy has working routing and a separately confirmed gateway delivery,
and its verified recipient now has the requested active alias. Controlled native forwarding checks remain with the owner.
SimpleLogin stays private because of its unresolved framework/dependency review.
The owner explicitly authorized setup emails; those messages were sent through
PMG. No general outside-recipient testing is inferred from that permission.

| Application | Completed work | Exact remaining boundary |
| --- | --- | --- |
| Kill the Newsletter!2.1.3-p2 web / p1 SMTP jobs | Public native feed creation, received Atom item, deletion and isolated SQLite/files restore. HTTP3210; SMTP2526 permits only PMG10.10.1.20. Owner confirmed outside browser access and routed test delivery. | It receives newsletters into feeds and does not forward a copy to Gmail. Mail-edge-wide TLS/limits are not inferred from this one test. [Record](newsletters-deployment-2026-10-09.md). |
| addy.io1.7.3 | Native account/alias controls, CSV export, recipient rejection/deletion and MariaDB restore. HTTP3211; SMTP2527 restricted to PMG. Dedicated routing/SPF and certificate-verified outbound relay TLS checked. Owner reported a separate Gmail gateway test passed SPF/DMARC. | Native recipient is verified and the requested alias was created through the native API, with exact destination readback. Its temporary API credential was revoked. Native forwarding/reply/import and gateway DKIM signing remain separate; the owner performs delivery tests. [Record](addy-deployment-2026-10-09.md). |
| SimpleLogin4.82.4-p7 | Private HTTP3212/SMTP2528; native auth/CSRF/sudo, permitted-domain CSV, SMTP check, fictional deletion/restore and old-image schema compatibility passed. | After the p7 runtime updates, the dependency review retains55 advisory rows /30 deduplicated groups across8 packages, not a count of proven exploits. Compatible maintenance/security work and authorized native mail/signing tests precede public launch. [Record](simplelogin-deployment-2026-10-09.md). |

Caddy/Cloudflare HTTP configuration cannot receive SMTP. The chosen mail edge must
route only the intended domains/recipients and must not become an open relay.
Existing application-mail delivery is not evidence of authorized public alias
forwarding. Native retention, export omissions and backups differ between these
applications; use the dated records rather than a single universal mail promise.
Newsletter-to-feed ingestion cannot send confirmation replies and is distinct
from forwarding/reply aliases. No working general temporary mailbox is promised.

## Three distinct link workflows

| Capability | Current implementation and scope |
| --- | --- |
| Remove tracking parameters | URL Parameter Cleaner 1.1.0-p1 is live/catalogued at tools.utilibre.org/apps/link-cleaner/. Native local preview, conservative keep/removal rules, clipboard and profile/report export/import passed. It does not contact pasted destinations or prove their safety; unknown/access/signature parameters are not silently discarded. [Record](link-cleaner-deployment-2026-10-09.md). |
| Create a persistent short link | Chhoto URL 7.8.3-p3 is live at links.utilibre.org through private 3208. Anonymous creation is limited to 2/minute with burst 4 and a maximum 30-day lifetime; native authenticated administration protects listing/editing/deletion. The redirect does not fetch the destination or write click counts. Public native UI/permissions, 22 tests, exact fixture deletion and isolated SQLite restore passed. Bilingual catalog/guide/search/status are live. [Record](chhoto-deployment-2026-10-09.md). |
| Follow redirects / inspect a URL | Unfurl 2026.10-p1 is live/catalogued at expand.utilibre.org. Public fictional browser flow, 408 native/regression tests and enforced proxy/namespace/DNS/private-address controls passed. It follows headers only, at most 10 distinct URLs, with 2 simultaneous jobs and no persistent URL-history database. Destination requests may consume one-time links or register engagement. This server/external workflow is separate from the local Outlook decoder. [Record](unfurl-deployment-2026-10-09.md). |

Chhoto stores complete destination mappings as readable data; short links are not
confidential. Its native expiry does not erase same-VM backups. A person following
a redirect contacts the destination normally. Chhoto's daily SQLite backup is at
04:50 UTC plus up to 5 minutes, with no automatic backup expiry. No visit statistics
were enabled merely because a native shortener supports them.

The earlier Shlink lead was not selected or installed; current implementation
uses Chhoto. The existing private opener and decoder remain useful for their own
limited tasks. The separate 13ft reader is public/catalogued at read.utilibre.org,
with verified outbound and browser boundaries. It reads direct HTML 200 responses;
redirects/login/JavaScript/archive fallbacks are unavailable. The 8 October
fixture pilot is historical, not the current endpoint. See the
[final deployment record](13ft-deployment-2026-10-09.md).

### Historical native-tool checks — 8 October 2026, 23:36 UTC

These checks remain evidence for the specific installed functions below. They
precede the new cleaner/shortener and do not describe current installation gaps.

| Installed application | Existing native function | Scope and limit |
| --- | --- | --- |
| IT Tools 2024.10.22-p2 | [Outlook Safelink decoder](https://dev.utilibre.org/safelink-decoder) | Extracts the wrapper's encoded `url` parameter locally and displays a copyable destination. Does not visit that destination, resolve HTTP redirects, remove its tracking parameters, or establish that it is safe. Its wrapper check is a substring match, not host authenticity validation. |
| IT Tools 2024.10.22-p2 | [URL parser](https://dev.utilibre.org/url-parser) | Locally displays URL components and the full query string. Query fields are read-only; no parameter-removal control or rebuilt clean-link output exists. The individual parameter list collapses repeated names, so retain the complete `Params` string when inspecting those URLs. |
| OmniTools 0.6.0-p6 | `/string/url-encode-string` and `/string/url-decode-string` on tools.utilibre.org | Percent-encodes or decodes text locally. Decoding does not follow redirects or remove trackers; decoding a whole URL can change how its reserved characters are interpreted. These are not cleaners or shorteners. |
| CyberChef 11.5.0-p1 | `Parse URI`, `URL Decode`, `Find / Replace` | Local inspection and explicit text replacement with visible input/output. There is no dedicated tracking-parameter cleaner in the installed operation registry. A broad find/replace recipe cannot reliably infer which query fields are disposable. Network operations remain disabled, so this is not a redirect-following service. |
| DeGoog 1.0.0 | Server search-result `cleanUrl()` and vendored ClearURLs rules | Automatically removes `utm_*` and a fixed tracking-parameter list, applies provider rules and unwraps recognized encoded redirector URLs without fetching those destinations. This is part of search-result processing, not a user-paste tool with a before/after preview. It also removes fragments and normalizes paths; it is unsuitable as a general cleaner for signed URLs or links carrying access keys in fragments. |

The native **Outlook wrapper decoder** is surfaced by the sixth bilingual guide,
accurately labelled as such:

- EN: “Open Outlook Safelink decoder. Paste the wrapper in ‘Your input Outlook
  SafeLink Url’. Review ‘Output decoded URL’ before copying it. This reveals the
  embedded destination; it does not check its safety, follow further redirects
  or remove tracking parameters from that destination.”
- ES (voseo): “Abrí Outlook Safelink decoder. Pegá el enlace envuelto en ‘Your
  input Outlook SafeLink Url’. Revisá ‘Output decoded URL’ antes de copiarlo.
  Esto muestra el destino incluido; no comprueba su seguridad, no sigue otras
  redirecciones ni elimina los parámetros de rastreo de ese destino.”

The decoder's pasted input is kept in component memory; its code does not send
it to a server, put it in the page URL or save it to browser storage. Application
delivery still uses the normal dev.utilibre.org HTTPS/provider path. On the
live native route, a fictional wrapper decoded to exactly
`https://example.org/fictional-report?utm_source=fixture&item=42#section`.
Browser request capture saw only dev.utilibre.org requests, no wrapper or
destination request, and no input in the page URL. The live URL parser also
displayed that fixture's complete query without fetching its destination.
The browser sessions were closed; no accounts or server records were created.

Do not suggest pasting a confidential URL into DeGoog search as a cleaning
workaround: that would turn the URL into a server-handled search query that can
reach the configured search engines. The functions in this historical table are not themselves persistent short-link
mappings or general redirect-following tools. The cleaner and Chhoto outcomes
above now fill their respective gaps; Unfurl is also public with its bounded native workflow.
Changing a query parameter can invalidate a signed link even if its name resembles
a tracking field, so unknown/signature/access parameters must not be silently removed.

Evidence: IT Tools revision `5732483fc24a6e6818839060bdf3cc7d9d324b9f`,
`src/tools/{safelink-decoder,url-parser,url-encoder}`; OmniTools revision
`922b28ce154e8f22da4a721472889717a95f7562`,
`src/pages/tools/string/{url-encode,url-decode}`; CyberChef revision
`8cd426dd4f40f1423912d5fad91b578a86a65112`,
`src/core/operations/{ParseURI,URLDecode,FindReplace}.mjs`, plus the installed
`deployment/toolbox/cyberchef-local.js` restrictions. DeGoog installed-container
`/app/src/server/search/{url-normalize,clearurls,scoring}.ts` hashes match pinned
revision `4a9bcc74f0fceaa33efbab4777f063274cce23d6`; the separate source checkout's
newer HEAD was not used as evidence of the deployed version. Only fictional
local-input browser checks were performed; no redirect destination was fetched.
