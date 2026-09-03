# SearXNG configuration

`settings.yml` is a small overlay on the pinned official defaults. Its General
category deliberately combines Google CSE, Wikipedia, Bing, Fynd, and Wiby,
with explicit weights to put the most useful bilingual contributor ahead of
noisier niche indexes. Curated specialist engines provide image, news, video,
IT, science, map, and dictionary results without joining every ordinary web
search. `keep_only` retains an upstream engine's `disabled` value, so required
credential-free engines are enabled explicitly.

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
