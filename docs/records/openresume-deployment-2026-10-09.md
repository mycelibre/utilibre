# OpenResume deployment — 9 October 2026

The static OpenResume builder/parser is live at `https://resume-builder.utilibre.org`, private gateway `10.10.1.43:3205`. Source commit `4f8255a2c763479837f69f1dccf2a3338730cd79`, local image `utilibre-openresume:4f8255a-p1`. Root licence is GNU AGPLv3, only/or-later scope unconfirmed. This account-free local PDF builder/parser is distinct from the existing account-based Reactive Resume instance.

The deployed build removes Vercel Analytics and the external GitHub count iframe. Simple original geometric icons replace upstream paths marked commercially licensed Font Awesome Pro; the modified source archive and patch do not redistribute those original paths. A direct Utilibre/source link is in the existing navigation. Next.js outputs static files; there is no Next server/API handling uploaded resumes. PDF.js 3.x uses the documented `isEvalSupported:false` mitigation for [CVE-2024-4367](https://github.com/advisories/GHSA-wgrm-67xf-hhpq); gateway CSP also disallows JavaScript eval while permitting the renderer's WASM. This is a narrow mitigation, not a claim that every dependency has been modernized.

Files are parsed and generated in the browser. Native localStorage retains editable form data after the tab closes. Clear this tool's site data to remove it; downloaded PDF copies remain until deleted. Native PDF import reconstructs text into fields heuristically: it is not a lossless editable-project backup, and layout, some fields and formatting may need repair. No account/server document copy exists to retrieve or delete. Fonts/assets are local. User-clicked external links still navigate outside Utilibre. Gateway/Cloudflare/edge receive ordinary page requests and connection metadata, not resume file uploads in the verified flow.

Real public HTTPS checks created a fictional resume, downloaded a valid PDF, reloaded the retained browser name, then parsed that PDF through the native parser. All browser HTTP requests stayed on this host and were GET/HEAD; JavaScript errors were absent. Source/build/config checks confirmed analytics and the external iframe are removed. The app's native interface is English; bilingual catalog guidance should state that limit rather than imply full application translation.

Runtime is static nginx with 0.5 CPU, 96 MiB and 64 PIDs, read-only filesystem and bounded temporary space. Gateway access log is off; warning/error Docker logs rotate at 2 × 5 MB, not a fixed number of days. Noindex is an indexing preference, not access control. Native local processing has device-memory limits; no numeric file-size capacity was established.

Rebuild with `deployment/community/openresume/build.py` against the exact clean pinned checkout. It applies the bounded patch and original replacement icon file, builds with telemetry disabled, and creates the static image. Roll back by retaining the preceding image/config; there is no server-side user document database to restore. [Modified source](https://tools.utilibre.org/utilibre-source/openresume-utilibre.tar.gz) includes build inputs. Private fictional test evidence: `/opt/utilibre/reports/new-services-20261009/openresume-browser.json`.

## 6 November 2026: Guatemala CV journey

The existing `/es/guias/curriculum-local` and `/en/guides/local-resume` routes
are retained. They now contain a task-first heading/action, three original
fictional examples (first employment, customer service, administrative support),
PDF and editable-text downloads in both languages, an actual native preview,
and practical instructions for preparing and checking the file. The examples
are writing aids, not official Guatemalan application forms or promises about
recruitment systems. No 22,200-search estimate is published as a verified fact.

The same pinned OpenResume source is built into English `/resume-builder` and
Spanish `/es/resume-builder`. The new bounded UI patch uses the native Redux
state, form components and PDF renderer; no account, new dependency or processing
backend is added. The existing localStorage key is preserved. New Spanish drafts
have Spanish section headings; switching language does not translate or replace
existing content. Parser/importer remains English and is explicitly described
as approximate. PDF loading/error states are exposed instead of a dead link.

A text-escaping correction prevents native bullet content from being interpreted
as HTML. An isolated two-image regression reproduced markup interpretation in
the previous build and confirmed inert text in the candidate. This is a concrete
local bug correction, not an invented CVE or proof of real-world exploitation.

Verification: six one-page PDFs exported by the native app and read with PDF.js;
Spanish accents/ñ, legitimate content, browser persistence, language switching,
and desktop/touch-emulated download. Network observations used synthetic clean
contexts and saw only the candidate origin and GET/HEAD requests. Real phone
hardware and Google-selected canonical/indexing remain unverified. The 120
portal unit tests pass. The development-server e2e run passed 98/100; the two
existing no-JavaScript tests subsequently passed against the built SSR server,
where server-rendered navigation is available. The six focused SSR checks
(those two plus the four EN/ES desktop/mobile CV checks) passed on both the
release candidate and the public deployment. The CV test now reads the real
public configuration in SSR mode instead of expecting Vite fixture hostnames.
Private evidence is kept outside the repository under
`/var/lib/utilibre-maintenance/cv-20261106`.

The exact existing repaired nginx runtime is retained. The frozen native-image
scan extracted 70 packages and retained the same one MEDIUM and two UNKNOWN
findings, with no added findings. Static bundled npm dependencies are not covered
by that native extraction; the dependency lock is unchanged. Builds run with
2 CPU / 4 GiB limits, without networking after the explicit locked npm install.
Normal static service limits remain 0.5 CPU / 96 MiB. See the reproducible build,
source-offer and scoped rollback instructions in
[`deployment/community/openresume/README.md`](../../deployment/community/openresume/README.md).

Browser-user-agent requests reached both public pages with 200. The earlier
403 occurred with a generic Python client. That is not evidence that Googlebot
is blocked or admitted: Search Console's real live inspection remains the
appropriate crawler check. The guide remains indexable and the editor retains
its intentional noindex; no Cloudflare protection was weakened.

### Released and verified on 6 November, 17:58–18:01 UTC

The implementation commit is `7b29d6c`. Only the existing OpenResume `web`
service and the portal were recreated through the established scoped release
helper. Configuration excluding the image remained identical; no data migration,
Caddy change or new service was involved. Exact-image health checks and public
EN/ES checks passed. The full six-PDF workflow also passed on the public builder
with Chromium 151, using fictional data in disposable browser contexts. It
observed no requests outside that origin and no content uploads. This is a
bounded observed workflow, not a claim about every possible user action.

| Artifact | Released image | Previous image retained for rollback |
| --- | --- | --- |
| OpenResume | `utilibre-openresume:cv-es-20261106` / `sha256:613549f73cad74ffea98731f43681a2519db76fb8380068affb87fa06e863d80` | `utilibre-openresume:security-20261011-nginx1305-tiff472-libs20261021-nginx1306-cb20261028-expat210-20261103` / `sha256:5eee758b3f300245f9f6b13a3c11fda380f43112d5a82fbc5930177c20a4a900` |
| Portal | `utilibre-portal:cv-20261106` / `sha256:3c9fe512024ac1f3dfba1f71db55c90f4719a58d370a9abbcb17008ab7c408f1` | `utilibre-portal:release-refresh-20261106` / `sha256:0243688ca5bc6f67632f74b66e0a0e877aebb02cd00940605a12d3beee75aeca` |

The portal candidate's frozen scan extracted 18 Alpine and 3 Node packages with
no reported findings. OpenResume retained the three runtime findings described
above. The native scan does not establish coverage of all bundled JavaScript.

Evidence files in the private directory: `browser/results.json`,
`public-browser/results.json`, `markup-regression.json`, `clean-checks.log`,
`portal-e2e.log`, `ssr-e2e.log`, `public-portal-e2e.log`, `public-discovery.json`,
`source-parity.json`, `scans/{before,final,portal-final}.json`, and
`{web,portal}-release.json`. Public discovery checks confirm one description per
guide, canonical/hreflang signals, page-level indexing permission and both guide
URLs in the sitemap. Search Console access and actual indexing are unavailable.

The updated corresponding-source archive is published at the existing source
offer. Its SHA-256 is
`1b4fe010567c35fca8b7c617144c1ae8dff78f5cfc280cc5da21ed01ec2e3ca4`;
its predecessor is retained in the private publication directory. The integration
archive is republished from the final committed repository, excluding unrelated
working-tree edits.

For rollback, restore the preceding OpenResume image scalar in
`deployment/community/compose.openresume.yaml` and the preceding `PORTAL_IMAGE`
value in the protected root `.env`. Recreate only those two services with the
same scoped `--no-deps --no-build --pull never` procedure and rerun their health
and public checks. Restore the matching previous source archive/index if rolling
back the source offer. Browser drafts and downloaded PDFs are not changed by
this operation. Previous configuration copies are protected in the private
release directory; do not commit them.
