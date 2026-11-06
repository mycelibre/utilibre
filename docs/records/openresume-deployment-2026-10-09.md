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
portal unit tests pass. The development-server e2e run passed 98/100; two existing
no-JavaScript tests require the built SSR server rather than Vite's fallback and
are rerun against the release candidate. Private evidence is kept outside the
repository under `/var/lib/utilibre-maintenance/cv-20261106`.

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
