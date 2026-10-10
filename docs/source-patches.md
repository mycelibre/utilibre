# Persistent source adaptations, reviewed 9 October 2026

Prefer native configuration and the application's own account, invitation,
encryption and export features. The portal presents these features; it does not
implement another identity store or permission system.

[`deployment/source-patches.json`](../deployment/source-patches.json) records all
70 patch files, their exact source revision, ordered prerequisites, purpose and
removal condition. `python3 scripts/audit-source-patches.py` applied each patch
to its pinned upstream tree in a disposable Git index, reversed it, and verified
the exact original tree. All 70 passed. Existing source worktrees and their
indexes were preserved. This verifies reconstruction, not every runtime path,
dependency advisory or upstream license decision.

Later October 9, `whisper-repair.patch` became record 71. Its focused disposable-
index apply/reverse check passed after `whisper-source.patch`, without rerunning
unrelated apps. Most of its diff is the lockfile and native formatter output;
runtime changes remove unused remote-audio code, repair build type annotations
and preserve native styling under Tailwind 4. It does not replace inference.
Fresh installation, lint, build, 13 regressions and full dependency audit passed;
the direct-URL pilot passed public EN/ES browser checks. It remains absent from
the catalogue pending the owner's quality review. See [release and rollback](service-pack.md#whisper-repaired-direct-url-pilot-still-hidden-from-the-catalogue).

Several `*-source.patch` files are complete release-source diffs that include
Docker recipes, deployment configuration, notices, tests and lockfiles. They
are not all small runtime fixes. At the 8 October checkpoint, notable diffs included SafeTwitch's 4,645
changed lines (104 outside build/dependency metadata), LRCLIB's 1,829 (127), and
BiblioReads' 1,151 (165). AnonymousOverflow contains 568 lines outside that
metadata, including transport tests. Preserve those bounds; do not add product
features to transport/privacy adapters. Review runtime changes separately from
lockfiles and packaging with `git apply --numstat` and per-file diffs.

LibreMDB and the new Dumb repair candidate remain private; Whisper remains
hidden from discovery, with the repaired direct-URL pilot noted above. Rimgo and BreezeWiki still have separately documented media failures,
although BreezeWiki's tabs are repaired. A successful patch audit does not
establish a working provider connection or complete application workflow.

## Small adaptations outside patch files

| Adaptation | Current scope and removal gate |
| --- | --- |
| Galene `Dockerfile.galene` | Two native HTML option attributes make Simulcast default to off; assertions fail if upstream changes. Default-auto four-person relay tests failed; the off setting and then the deployed default passed UDP/TCP/TLS media checks. Keep native user controls. Remove when an upstream/default configuration passes those tests within the same resource bounds. No SFU/codec/authentication code was forked. |
| LiberaForms `liberaforms-privacy.py` | Exact-match build changes disable optional activity history/statistics and add source links. Keep native encrypted answers, consent/version records, permissions and key backups. Replace individual substitutions when native upstream configuration supplies the same privacy behavior. |
| Browser tools' build/preparation scripts | Disable remote imports/analytics or mirror required assets; retain native editing and export. Each upstream upgrade must repeat real workflow and network checks before dropping a substitution. |
| Wakapi summary patch | Missing OIDC-only controls and empty-summary guards, plus accurate free-service retention wording. Remove guards when upstream fixes them; replace wording with native instance branding when supported. |
| Binternet onion startup wrapper | Native Nginx startup/quit with narrowly guarded stale-socket recovery. Drop when the upstream startup lifecycle handles abandoned sockets safely. Never unlink an active listener or ordinary file. |
| CV startup and Nginx resource wrappers | Native readiness and worker/connection settings. These are deployment configuration, not new application APIs. Remove wrappers when upstream exposes equivalent supported settings. |
| SearXNG log hook | Redacts selected query-bearing records. Native comprehensive redaction would replace it after tests; it is not a guarantee about every future logging path. |

## Upgrade and removal procedure

1. Pin the proposed upstream revision and review its release/security changes.
2. Check whether native configuration replaces each local concern. Remove only
   that adaptation in a temporary build; do not weaken egress, source availability
   or access controls merely to make a build pass.
3. Reproduce dependency installation/build, then run the relevant native
   workflow, privacy and isolation checks. Run the patch audit for remaining
   patches against their explicitly updated pins.
4. Publish matching source/build recipes, deploy only the affected service and
   retain its previous image/configuration. Remove obsolete adapters from the
   new release after verification; retain old published source archives.

New relay files are separate from Galene and PairDrop. Removing the relay uses
its documented ICE/firewall rollback; it does not require reverting the native
room configuration or deleting invitations, secrets, certificates or user data.

## October 8 disclosure and generator follow-up

Two narrow static-tool patches replace insecure `Math.random()` sampling in
OmniTools' password generator and IT Tools' token generator with WebCrypto
randomness. Their digest-gated artifact edits, native-browser checks and removal
conditions are recorded in the same manifest; no new password service was added.

The FMD disclosure patch replaces its hardcoded general privacy assurances with
EN/ES voseo instance notes, using the existing i18next system and native privacy
route. Spanish privacy text is complete; other upstream application namespaces
fall back to English. The server API binary stays the pinned upstream 0.17.0
image. Its native `--web-dir` option selects the versioned, read-only web build.
Upstream 0.17.0 uses a plain file server in that mode, so the existing gateway
rewrites only `/privacy` to the web entry point internally, preserving the query
string. The Android embedded privacy route stays available; APIs are unchanged.

Reproduction: `node deployment/community/prepare-fmd-web.mjs` checks revision
`224b60c0756ff363bc19063082a8a1543559cf96`, applies the four-file patch, installs
with the upstream pnpm 11.20.0 frozen lockfile, runs TypeScript/Vite, and creates
a new output directory. It refuses to overwrite an existing versioned output.
The source publisher includes upstream source, patch, lockfile and deployment
recipe, excluding dependencies, private configuration and operational records.

The apply/reverse audit passed all 25 entries. FMD's build/typecheck and four
normal/embedded EN/ES mobile privacy checks passed with native language switching,
keyboard links, no horizontal overflow and no external requests in that page.
The upstream ESLint command fails before checking source because its pinned
TypeScript 7.0.2 is unsupported by its pinned typescript-eslint 8.65.0. No
unrelated dependency change was made to conceal that limitation.

The native override was deployed on 8 October 2026. The public HTTPS check
passed all four EN/ES normal/embedded cases. Native image digest, resource limits,
read-only filesystem and database schema matched the pre-change snapshot;
SQLite integrity passed. The native API test verified invitation rejection,
opaque-data round trip and account isolation, then deleted both fictional
accounts. The FMD security discovery URL resolves to the live canonical portal
file. The subsequent 9 October FMD p2 check passed native browser decryption,
ZIP download/reopening and exact fictional CSV/image/metadata assertions, with
zero-value preservation and native deletion/token rejection. See
[fmd-export-verification-2026-10-09.md](fmd-export-verification-2026-10-09.md).
Physical Android recovery, push delivery and account ZIP import remain untested.

## Restricted 13ft evaluation and Resume tracking correction

The inventory also includes the stopped, fixture-only 13ft evaluation. Its
one-file patch is not a public deployment approval; see 13ft-review.md for
enforced restrictions and the remaining arbitrary-URL boundary.

Reactive Resume's three-file source correction disables the common counting
predicate before visitor identifiers/deduplication, removes the browser download
event and removes the owner statistics widget. Digest-gated compiled edits
match that source in the pinned official image and version browser asset URLs.
Historical records are not deleted. Replace this adaptation when a native
instance-wide opt-out passes the same regression checks. Native owner/public,
PDF/JSON export and sharing checks passed in isolation and over public HTTPS.
Deployment, synthetic-data evidence and recovery are recorded in
[the correction record](reactive-resume-privacy-2026-10-08.md).

## PrivateBin homepage discovery, 9 October

The pinned 2.0.6 application's native `template` setting selects a custom copy
of its Bootstrap 5 template. A small source patch adds an EN/ES voseo homepage
introduction, descriptive metadata and Utilibre icon references. Only the empty,
error-free homepage is indexable. Paste/query/error views retain noindex; request
values and submitted content never enter the homepage metadata. Native Nginx
include files serve the icons and scoped crawler rules. The original container
image and upstream template are retained.

`deployment/utilibre/privatebin-discovery/prepare.py` checks the exact upstream
revision and template digest before applying the patch. The patch's apply/reverse
record is in the existing manifest. Remove the adaptation when upstream instance
configuration provides the same scoped behavior and the recorded checks pass.
This does not change encryption, expiry, storage, backup retention or account
requirements. See the dated PrivateBin discovery record for deployment checks
and rollback.

## TRIP stylesheet loading, 9 October

The one-line `deployment/trip/rendering.patch` selects Angular's native
`optimization.styles.inlineCritical=false` production option. The previous
build kept the main stylesheet in print-only mode because its inline activation
handler was blocked by the instance's script policy. The new build emits a
normal stylesheet link and preserves the strict CSP. It changes no travel data,
permissions, providers or retention. Keep the adaptation until the upstream
build loads styles under the same policy and desktop/mobile checks pass without
it. The patch is separately removable from the instance and dependency patches.

### Chhoto form and instance-note layout

`deployment/chhoto/layout.patch` follows the no-analytics/local-assets patch against the same pinned7.8.3 release. It changes stylesheet discovery and responsive spacing only. The public browser reproduced the bilingual note block overlapping the form because it inherited absolute toolbar positioning. Remove this patch when upstream supported branding accommodates the notes without overlap; keep the existing privacy adaptation separately. See `chhoto-deployment-2026-10-09.md` for verification and rollback.

The TRIP rendering adaptation also handles the native missing public-share resource (404) without throwing an Angular exception. Other failures still propagate; it does not create sharing links or change authorization.

## 9 October native repair checkpoint

All 68 indexed patches applied and reversed against their exact upstream trees.
The latest check includes Donetick p3 account-session deletion, BreezeWiki p3
native tab initialization and the private Dumb cache/error/rendering repair.
The record does not turn Dumb into a public service: Genius retrieval remains
subject to the separate access test in `dumb-repair-2026-10-09.md`. WBO p3 uses
its existing native template/configuration integration, with a separate tested
temporary-state preservation procedure; it adds no application patch.

Evidence: `/opt/utilibre/reports/queue-completion-20261009/source-patches-final.json`.
