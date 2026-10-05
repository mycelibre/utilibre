# SearXNG configuration

`settings.yml` is a small overlay on the pinned official defaults. Its General
category deliberately combines Google CSE, Wikipedia, Bing, Fynd, Wiby, and Mwmbl,
with explicit weights to put the most useful bilingual contributor ahead of
noisier niche indexes. Curated specialist engines provide image, news, video,
IT, science, map, and dictionary results without joining every ordinary web
search. `keep_only` retains an upstream engine's `disabled` value, so required
credential-free engines are enabled explicitly.

The 2026-10-05 expansion adds five engines after bounded checks from this VM:
Mwmbl (General, weight 0.3), Google CSE Images (Images), and Ask Ubuntu,
Super User, and ManKier (IT). There are 28 retained engines. Mwmbl is a
small-index complement with no language filtering or paging; it must not
displace the stronger bilingual contributor. Specialist additions are
explicitly kept out of General. See the dated review for successful-result
counts, rejected candidates, privacy/quota exclusions, and test limitations.

Fynd is deliberately first-page-only. Its current pagination links require
per-search `sx`/`psx` state as well as an offset, while the maintained generic
XPath definition sends only the offset. Leaving `paging: true` therefore
repeats the same ten Fynd rows on page two and later. Re-test the live upstream
contract and the maintained SearXNG definition before removing this override.

Anonymous searches are capped at five pages. Google CSE already has that hard
limit, and pages beyond it would contain only the niche Wiby index while still
inviting more upstream work. A page-five result can still show SearXNG's stock
Next control; page six is an empty terminal page and causes no engine fan-out.
The single public egress also uses the documented public-instance suspension
windows: one day after access denial or CAPTCHA and one hour after HTTP 429.
This protects upstream access; it does not promise that an upstream will never
rate-limit the instance.

Bounded English, Spanish, and category checks from this application VM passed
on 2026-08-30. Google CSE's pinned engine uses an unofficial Google JSONP route
and an upstream Blackle partner CSE identifier; it is useful but brittle and
must remain disclosed. Known blocked or failing candidates were left out. See
`docs/searxng-engine-review.md` for sources, observations, exclusions, and the
admission test for future changes. Engine blocking is operationally unstable,
so re-test rather than enabling a broad default set.
`limiter.toml.template` is rendered as the ignored
`config/searxng/limiter.toml` with one exact trusted edge address by
`scripts/render-config.mjs`. The whole directory is mounted read-only, which
also overrides the upstream image's `/etc/searxng` volume and prevents an
untracked anonymous configuration volume.

The 2026-09-29 update uses upstream's curl-cffi networking defaults; the retired
HTTPX `pool_maxsize` setting is omitted. The instance footer links to this
configuration and its local logging integration. Official searx.space monitors
are permitted by `pass_searxng_org`, with the existing exact-edge client-IP
trust unchanged. Public listing still depends on the separate
[direct-HTTPS migration](../../docs/searxng-public-instance.md).

`sitecustomize.py` is original AGPL-3.0-or-later integration code. It is loaded
through Python's documented `sitecustomize` mechanism. When it recognizes a
`q`/`query` field or an HTTP(S) URL query, it retains the trusted prefix and
conservatively discards the remainder of that rendered log record before
Docker captures it. This avoids spaces, punctuation, or escaped quotes leaking
parts of a search term. This is a local runtime modification to SearXNG's
logging behavior and must remain available through the configured project
source URL. It does not change search requests or results. Run
`python3 scripts/test-searx-redaction.py` from the repository root to exercise
the regression cases.
