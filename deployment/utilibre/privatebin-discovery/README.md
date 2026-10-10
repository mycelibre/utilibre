# PrivateBin homepage discovery

This is a supported custom template for the pinned PrivateBin 2.0.6 image, not a
backend or encryption modification. Native template selection loads
`bootstrap5-utilibre.php`. It is generated from upstream `tpl/bootstrap5.php`
with `homepage-template.patch`; original application labels, controls, scripts,
SRI, CSP and footer remain.

Source: https://github.com/PrivateBin/PrivateBin/tree/921ab83f268add709413a87206e4e1c2e3c2063d
(tag 2.0.6). The template's Zlib licence and upstream attribution are retained.
This altered template is marked as Utilibre's customization. Keep the upstream
`LICENSE.md` and this patch available with the deployment source. Brand assets
are existing Utilibre assets from `portal/public/brand`, not remote resources.

To regenerate, clone that exact revision into a clean checkout and run
`python3 deployment/utilibre/privatebin-discovery/prepare.py /path/to/checkout`.
The preparer checks both the revision and original template checksum, applies the
patch and writes only the generated repository template. It does not update a
live service, copy data or change expiry options.

The compose manifest mounts the custom template, branding, manifest, robots and
small supported Nginx include files. Only exact `GET /` with no query, status or
application error gets descriptive indexable HTML. `HEAD /` has matching response
headers. Named real branding files remain fetchable without noindex. Other
request paths/methods retain `X-Robots-Tag: noindex, nofollow, noarchive`; private
HTML also has its native noindex meta directive. No paste identifier, fragment,
plaintext or submitted field is interpolated into homepage metadata.

Robots permits the exact homepage and static dependencies while excluding
private/query URLs. This is a crawler policy, not confidentiality or an access
control. Keeping private paths disallowed also means crawlers may not inspect
their noindex response; do not expose encrypted records merely to accelerate
search-engine removal. HTML remains native no-store; static asset caching is
preserved. Language/cookie Vary is added only to rendered HTML.

`node deployment/utilibre/privatebin-discovery/check.mjs` creates a disposable
isolated instance with fictional state, exercises native encryption/decryption
and deletion, then removes that instance/network/state. It never mounts real
paste data or runs the whole-stack backup. `check-public.mjs` is read-only and
checks EN/ES homepage, safe invalid query/path metadata and exact icon bytes.
The existing PrivateBin restore rehearsal now restores/mounts this custom config
bundle too; its full backup/restore was not rerun for this metadata-only change.

Remove the patch when native upstream settings provide equivalent scoped
homepage metadata, branding and indexing. Repeat both checks before switching
back. For rollback, restore the previously saved compose/config, recreate only
PrivateBin, and leave its real data mount untouched. Added asset files can remain
unused until a separate cleanup; no user content or backup needs removal.
