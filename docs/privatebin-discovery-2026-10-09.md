# PrivateBin homepage search description and icon

Implemented and publicly verified 9 October 2026. The empty
[PrivateBin homepage](https://paste.utilibre.org/) now has a descriptive EN/ES
title, description, canonical URL, social preview and an actual Utilibre favicon.
Spanish additions use voseo. The visible introduction accurately describes
browser encryption, expiration choice and account-free sharing. Native
PrivateBin identity and controls remain.

Previously, `/robots.txt` disallowed the entire instance, every rendered page
had `noindex`, the homepage preview described an already-created note, and
`/favicon.ico` fell through to application HTML. Those conditions prevented a
useful normal homepage search preview.

## Scope and privacy

Only an error-free exact `GET /` with no query or action is marked indexable.
`HEAD /` returns compatible headers. Paste URLs, query/action requests, explicit
`index.php` and unknown paths keep noindex directives and no homepage canonical.
Private URLs remain excluded by robots. No paste content, identifier, password
or decryption fragment is added to service metadata or read for this task.

`/favicon.ico` now returns `image/x-icon`; 48px and 512px PNG icon links and a
180px touch icon point to actual local assets. The named branding files have no
conflicting noindex header. HTML retains native no-store behavior; normal static
caching remains. Language/cookie Vary applies only to HTML. Existing content,
expiry choices, size/rate limits, encryption, data mounts and backup retention
were not changed. No analytics or external assets were added.

## Changed files and deployment

- `deployment/utilibre/compose.yaml`: seven read-only config/asset mounts.
- `deployment/utilibre/config/privatebin/conf.php`: supported custom template
  selection only; previous branding and operational settings are preserved.
- The same config directory now contains `bootstrap5-utilibre.php`, `robots.txt`,
  `manifest.json`, `discovery-server.conf`, `discovery-location.conf` and four
  existing Utilibre icons under `brand/`.
- `deployment/utilibre/privatebin-discovery/`: narrow template patch, guarded
  regeneration recipe, README and isolated/public verification scripts.
- `deployment/utilibre/tests/check-privatebin-restore.mjs`: restore the complete
  PrivateBin configuration directory and mount its optional native template and
  assets in the rehearsal. This preserves compatibility with new backups.

The exact upstream template matches tag 2.0.6, revision
`921ab83f268add709413a87206e4e1c2e3c2063d`. Its source is checked out at
`/opt/utilibre/src/privatebin-discovery`; patch apply/reverse and reproduction of
the mounted template passed. No new image or backend fork was introduced. The
selected image remains
`privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8`.

The live equivalent files under `/opt/utilibre/config/privatebin` and scoped
mount additions in `/opt/utilibre/compose.yaml` were installed after a private
configuration/compose backup. Only `utilibre-services-privatebin-1` was recreated;
it is healthy. Rollback files are under
`/opt/utilibre/reports/privatebin-discovery-20261009/rollback-113149/`. Restore
those config/compose files and recreate only PrivateBin to undo the deployment;
keep the existing real data volume intact.

## Verification and limits

Private evidence directory:
`/opt/utilibre/reports/privatebin-discovery-20261009/`.

- Native PHP and Nginx validation passed.
- A disconnected disposable candidate passed real browser encrypted fictional
  paste creation, keyed decryption, unkeyed non-disclosure and native deletion.
  The keyed page and deletion action retained noindex. No real paste was read.
- EN and ES candidate/public pages passed metadata, native editor, local-request,
  error-free rendering and desktop/mobile overflow checks.
- Public exact homepage GET/HEAD, safely invalid query/unknown paths, robots and
  every branded icon passed. Public icon bytes match the local source hashes.
  Live robots immediately returned the corrected content; no edge purge was used.
- The source patch cleanly applies/reverses and regenerates the exact mounted
  template. Restore-script syntax passes. A full state restore was not repeated
  for this head/template/config change; its earlier evidence remains separate.

Google decides whether and when to show a description or icon after recrawling.
No search result update or Search Console submission is claimed. See Google's
[favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search)
and PrivateBin's pinned
[template configuration](https://github.com/PrivateBin/PrivateBin/blob/2.0.6/cfg/conf.sample.php).
The homepage is eligible for discovery; noindex and robots remain separate from
PrivateBin's actual encryption and access behavior.

## Public security-header repair

The operator applied the tested host-only Caddy response fix on 9 October:
`deployment/utilibre/edge/Caddyfile.privatebin-security`. Deferred header
replacement gives exactly one `X-Content-Type-Options: nosniff` and
`Strict-Transport-Security: max-age=31536000`. It does not add includeSubDomains
or preload, alter PrivateBin CSP, or change encryption and storage.

Mozilla Observatory scan 126795844 at 12:49:12 UTC returned **A+, 150/100**,
12 passed and zero failed. Before the change, scan 126794257 had 75/100, B: HSTS
was missing and the duplicated nosniff value failed validation. Observatory's
bonus scoring can exceed 100. This checks HTTP protections, not every property
of the application or an assurance that all attacks are impossible.

The public native workflow then passed: create a fictional encrypted text paste,
open it with its key, confirm the unkeyed view does not reveal the text, and
delete it through the native deletion token. The follow-up read failed as
expected. Paste and deletion responses kept noindex, and the editor made no
third-party requests or JavaScript errors. The fictional record was removed.
Evidence: `/opt/utilibre/reports/queue-completion-20261009/` files
`privatebin-after-edge.headers`, `privatebin-observatory-after.json` and
`privatebin-after-edge-workflow.json`.

File uploads remain disabled by the installed `fileupload=false` setting; this
instance accepts text pastes. That feature choice caused neither score deduction.
The upstream directory's attachment column is therefore correct; its old grade
may remain until that directory refreshes its scan.

References: [live Observatory report](https://developer.mozilla.org/en-US/observatory/analyze?host=paste.utilibre.org),
[Caddy deferred header replacement](https://caddyserver.com/docs/caddyfile/directives/header),
[PrivateBin directory](https://privatebin.info/directory/).
