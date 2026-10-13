# DeGoog public settings 404 repaired

Verified and deployed 9 October 2026. The reported
`https://degoog.utilibre.org/settings` now returns **200** and opens the native
public preferences page. The trailing-slash URL redirects to it. Only DeGoog's
gateway was reloaded; no application restart, provider change or data migration
was needed.

## Cause and scoped change

The gateway blocked `/settings` together with setup and operator APIs. That was
too broad for the installed official **DeGoog 1.0.0** image, digest
`sha256:e1ce8ee724a4514d269b74088424e579322bdf718256c1c5dd2cbb5aaf510c`,
source revision `4a9bcc74f0fceaa33efbab4777f063274cce23d6`.

The installed native `pages.tsx` handler explicitly serves
`settings-public.html` when `DEGOOG_PUBLIC_INSTANCE=true`, which is this
instance's active setting. That page sets `__DEGOOG_PUBLIC_INSTANCE__=true`;
the client takes its public initialization branch and hides operator panels.
The reviewed route/template/client files match the running image byte for byte.
Theme and search-display choices are saved in browser storage, not written to
the operator's settings file. A browser preference is separate from changing
the installation's providers or server defaults.

`deployment/community/degoog-gateway.conf` now makes an exact GET/HEAD exception
for `/settings`, plus a canonical redirect for `/settings/`. The broader deny
rule still covers other settings/setup paths and privileged APIs. The existing
four read-only default endpoints are unchanged. No general settings API was
opened, no operator credential was placed in the browser, and the native
nonce-based CSP remains in force. This is configuration glue; DeGoog source and
its three existing search engines were not modified.

## Verification

`deployment/community/check-degoog-settings.mjs` passed against real public HTTPS
with disposable browser contexts at 1280, 390 and 320 CSS pixels, using English
and Spanish browser locales. It checked:

- Native public settings and visible theme/checkbox controls. Theme and the
  open-results-in-a-new-tab preference persisted after normal reload.
- No horizontal page overflow, JavaScript errors, failed UI responses,
  automatic third-party requests or browser-initiated server writes.
- No operator plugin/transport/server panels. The operator settings file's hash
  was unchanged before and after these browser-only preference changes.
- GET and HEAD `/settings` return 200; `/settings/` returns 308 to `/settings`.
- Seven operator/setup/read routes remain 404; three attempted settings writes
  return 405. The four existing safe defaults endpoints still return 200.

Screenshots were inspected. The native settings controls currently fall back to
English in the tested Spanish browser context; this is not a claim that every
native label is translated. No new translation fork was introduced for a routing
fix. Closing each disposable context removed only its fictional test profile.
Existing users' browser preferences and server state were not cleared.

The existing broader `check-degoog.mjs` assertion now tests the still-blocked
`/settings/general` rather than incorrectly requiring the public preferences
page to return 404. This settings-only run did not send search queries to external
providers or change the existing search/cache/retention policy.

## Source and rollback

The corresponding source archive is refreshed through
`deployment/community/publish-degoog-source.sh`, including the exact reviewed
upstream release, existing engines and changed gateway/checks. No runtime
credentials or user data are included. The publisher preserves the previous
archive; the source release and application version remain 1.0.0.

Private evidence is under `/opt/utilibre/reports/degoog-settings-20261009/`:
origin/public headers, native browser results, screenshots and the original
gateway configuration. To roll back this configuration, restore that scoped
gateway file, run `nginx -t` in the DeGoog gateway and reload that gateway only.
That restores the known public-settings 404. No database restore is involved.
