# Dumb repair, 9 October 2026

The local application defects below are fixed and tested in a **private candidate**.
Dumb is not publicly restored: Genius still refuses this VM's outbound requests.
The working LRCLIB service at `lyrics.utilibre.org` was not replaced or restarted.
This supersedes the October 7 review's app-level findings without claiming the
remaining network problem is solved.

## Verified request failure

Official upstream HEAD is still `f5581074850bc31ed7df1ce96e8f428179bf0abb`.
One bounded check of the listed `dumb.bloat.cat` instance returned real search
results and a nonempty lyric page, with the same `v.f558107` footer. This proves
that the code can work elsewhere, not that all outbound connections are accepted.

From this VM, the corresponding Genius search and lyric URLs both returned 403
with `cf-mitigated: challenge`. An isolated original native Go image returned
search 500 and an error page misleadingly marked 200 for lyrics. The refusal
happens before the lyric parser receives content. Ordinary curl and Chromium
with native TLS/default headers also received 403/challenge for both URLs. The
Chromium check disabled JavaScript and subresources; it was not an interactive
challenge-solving session. These observations do not isolate IP address, client
fingerprint, cookies or policy as the cause. The native Go wrapper reported its
failures without preserving the upstream response headers. No challenge solver, login
cookie, third-party public-instance relay or replacement content provider was
configured. The current upstream PRs address rendering, not this refusal.

Known outbound configuration was checked by variable **name**, without exposing
values. No existing operator-controlled alternate HTTP/SOCKS route was found
in those inspected locations. Existing scoped Squid gateways have no configured
alternate outbound route. The Tor container supplies a Binternet
onion service only: `SocksPort 0`, no outbound client proxy. At that checkpoint
the VM had no global IPv6 address or default route. The owner subsequently
supplied an allocation and corrected its upstream routing. On 9 October at
13:49 UTC, ordinary public HTTPS requests succeeded over IPv6, while both
Genius URLs still returned 403 with `cf-mitigated: challenge`. The guarded,
persistent IPv6 configuration and these results are recorded in
`dumb-ipv6-readiness-2026-10-09.md`. This is no longer an unverified IPv6 return
path; it is a verified transport path on which Genius still challenges the
request. It does not establish an IP-only cause. The reader follow-up used that
existing evidence instead of repeating the denied requests. The existing Squid
and Tor services were not changed.

## Independent fixes completed

`deployment/community/dumb/source.patch` applies to the exact original commit;
there is no broad fork or replacement backend. It changes 8 files, including
fictional-data regressions and a 286-byte original SVG.

- Unavailable search/lyrics now return **502 with `Cache-Control: no-store`**,
  rather than a successful-looking lyric error. Missing or unparseable lyrics
  cannot enter the native successful-content cache. A later successful response
  still uses the native cache.
- Native BigCache configuration retains its **24-hour** public-content expiry,
  but uses 16 shards, a smaller initial allocation and a **32 MiB** hard cache
  ceiling. The original candidate used **255.4 MiB of 256 MiB** after two
  requests; the corrected candidate used **6.7 MiB of 256 MiB** after the same
  modest checks. Both observations are functional samples, not a load test.
- The exact empty inline-style/tab-stop removal proposed by upstream PR115 is
  applied. Strict existing CSP is retained.
- PR114's missing-cover URL correction is applied with an original locally
  bundled SVG. The PR's copied Genius PNG was not redistributed because its
  independent asset licence was not established. No third-party image fallback
  or network request was added.

App image: `utilibre-dumb:f558107-p1`, MIT application, image ID
`sha256:5f5a8898d5342562cb22b568bb26858a6f6e19f3433c61c80dd64289c3b23313`.
It preserves the pinned upstream Alpine runtime and uses the existing pinned
Go builder. The review container is nonroot/read-only, has 0.5 CPU, 256 MiB RAM,
64 PIDs and an 8 MiB temporary filesystem. The Go memory target is 160 MiB.
Logging is disabled. There is no persistent user data or public listener.

## Tests and reproducible preparation

`deployment/community/dumb/build.sh` archives the pinned upstream source, applies
`source.patch`, downloads the exact `go.sum` dependencies, then generates native
templates/CSS, runs the fictional checks and builds with networking disabled.
The source/binary remain available; only that build's disposable compiler/module
caches are removed. It does not change or start the current lyrics service.

Five focused tests, including two refusal/recovery subcases, pass. The rendering
and failure regressions fail against the original implementations. They use a
local fake HTTP transport and fictional text, never real lyrics or accounts.
Clean-source forward/reverse patch checks pass. The corrected native loopback
app returns home 200, a local SVG 200 and honest 502/no-store for both still-blocked
Genius requests. The existing LRCLIB container was left untouched.

Evidence is private under `/opt/utilibre/reports/dumb-repair-20261009/`, with only
request outcomes/counts in public documentation. The temporary candidates are
stopped after verification. The original image and source remain available.

## Exact remaining dependency and next operation

**Successful native Genius retrieval is required before public activation.**
An operator-controlled alternate connection is one concrete diagnostic, not a
guaranteed fix or proof that the current IP is the only cause. The owner can
provide an already-controlled
HTTP CONNECT or SOCKS proxy whose direct requests to these two public resources
return ordinary content (200, without a challenge):

- `https://genius.com/api/search/multi?q=Adele%20Hello`
- `https://genius.com/Adele-hello-lyrics`

The separate edge VM may have different outbound routing even though the owner
confirmed that it shares the physical host. Its egress is not accessible from
this session; a successful direct test there would be useful evidence.

Supply the verified proxy through a private mode-0600 environment file, as
`DUMB_REVIEW_PROXY=<the verified operator-controlled proxy URL>`, never a public
issue, repository, or chat message containing credentials. Native Dumb consumes
it as `PROXY`. The prepared command is:

```sh
docker compose --env-file /opt/utilibre/community-data/dumb-private/review.env \
  -f deployment/community/dumb/compose.probe.yaml up -d
```

The candidate remains **127.0.0.1:3299 only**. Confirm ordinary search, lyrics,
annotations and same-origin images through that route before any public switch.
A proxy needs CONNECT to the native Genius HTTPS destinations, with no access to
private/reserved destinations. TLS verification remains enabled. Its operator,
traffic visibility, logs/retention and any distinct provider must be documented;
an unspecified external proxy is not pre-approved by this recipe. No proof of an
acceptable alternate route is available yet. Adding a proxy on the same outbound
address alone would not establish a fix.

Rollback/removal is simply stopping the private candidate; it has no persistent
state. A future public change must retain the current LRCLIB image/configuration
and have a tested return path. Drop each source correction when native upstream
provides equivalent error handling, cache bounds or rendering behaviour; rerun
these regressions before removing it.

Primary sources: [upstream proxy option and instance list](https://github.com/rramiachraf/dumb/blob/f5581074850bc31ed7df1ce96e8f428179bf0abb/README.md),
[PR114](https://github.com/rramiachraf/dumb/pull/114) at
`cf4a17f277eddf125d52d806593f850e22c40502`, and
[PR115](https://github.com/rramiachraf/dumb/pull/115) at
`6bde73bba2204f33ed074d23e294ac658e0d2764`. Both PRs are still open.
