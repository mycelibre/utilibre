# Portal status coverage — 8 October 2026

## Cause and scope

The running portal exposed 46 observations for 54 enabled service IDs. Eight
enabled services had never been added to `STATUS_SERVICES`, so their catalog
rows correctly fell back to “Not checked” rather than inventing a healthy state:
`wbo`, `mapshaper`, `numbat`, `super-productivity`, `cryptpad`, `liberaforms`,
`galene`, and `mumble`.

The live configuration and snapshot were read from the existing portal binding
`10.10.1.43:4173`. The public status page and API were also attempted; automated
requests from this environment received 403, so that response was not used to
declare the application unavailable. The three listed-only services
`breezewiki`, `libremdb`, and `rimgo` are not enabled. This change does not enable
or mislabel those services.

## Configured observations

| ID | Fixed target | Meaning and verification |
| --- | --- | --- |
| `wbo` | `https://collab.utilibre.org/` | Public application entry page answered 200 from the live portal container. No board was opened or created. Its private port is not reachable from that container; the existing boundary was preserved. |
| `mapshaper` | `https://maps.utilibre.org/` | Public application entry page answered 200 from the live portal container. Private listener rejects that container with 403; no ACL was relaxed. |
| `numbat` | `https://calc.utilibre.org/` | Public entry page answered 200 from the live portal container; the private listener correctly rejected it. No expression was submitted. |
| `super-productivity` | `https://plan.utilibre.org/` | Public entry page answered 200 from the live portal container; the private listener correctly rejected it. No task or account was created. |
| `cryptpad` | `http://10.10.1.43:3173/` | Native interface answered 200 from the live portal container. This is not a document, storage, authentication, sandbox or collaboration test. |
| `liberaforms` | `http://10.10.1.43:3176/` | Native application page, through its existing gateway, answered 200 from the live portal container. This checks the application response rather than its separately served logo. No form or answer was created. |
| `galene` | `http://10.10.1.43:3178/` | Native Galene HTTP interface answered 200 from the live portal container. It does not claim a meeting, WebSocket, TURN or media test. |
| `mumble` | Existing Kuma public metadata and heartbeat API through `http://10.10.1.43:3125` | Reuses the native monitor named exactly `Mumble · private TCP listener`, of type `port`. The configured monitor checks private port 64738 every 300 seconds. No voice-server HTTP request, password, login or UDP packet is introduced. |

The four additional public origins are exact root-URL allowlist entries in
`portal/server/status-targets.mjs`. Other hosts, changed paths, ports, query
parameters and fragments are rejected. Probes do not follow redirects, and
public HTTP checks require a 2xx response. Existing private HTTP target rules
remain operator configuration, not a client-selectable URL API. The existing
SearXNG `/healthz` probe remains unchanged; no real search workload is submitted.

## Mumble evidence and freshness

Kuma's installed `/app/server/model/monitor.js` writes timestamps using
`R.isoDateTimeMillis(dayjs.utc())` (line 461); its
`/app/server/model/heartbeat.js` exposes that time unchanged in `toPublicJSON()`.
The zone-less SQL timestamp is therefore explicitly parsed as UTC, including
when the portal's timezone is `America/Guatemala`.

Exactly one matching public TCP monitor must exist and have its own heartbeat.
Missing, malformed, future, ambiguous or older-than-ten-minute evidence remains
`unknown`. A failed monitoring fetch is also `unknown`, not proof that Mumble
itself is down. Native DOWN, UP, PENDING and MAINTENANCE map respectively to
unavailable, operational, degraded and maintenance. The API labels this check
`tcp-listener` and includes the heartbeat's own `checkedAt`; it never substitutes
the snapshot-generation timestamp for that observation time.

The catalog's existing Mumble `degraded` limitation still takes precedence over
an UP listener observation. TCP acceptance cannot prove authentication, voice,
public routing or UDP audio. `ALLOWPING=false` remains unchanged. The metadata
and heartbeat fetches have a 2.5-second absolute timeout and 512 KiB response
limit and use only the existing fixed local status API. The normal portal
snapshot cache remains in place.

## Verification and deployment

- Nine focused status-target tests passed: exact public roots, rejected target
  substitutions, the fixed Mumble API, UTC parsing under Guatemala timezone,
  native failure states, and missing/stale/future/wrong-monitor evidence.
- `node --check portal/server/server.mjs` and scoped diff whitespace checks
  passed.
- A temporary loopback-only portal process using the staged server and exactly
  these eight Compose targets returned all eight real observations. The seven
  HTTP interfaces answered successfully. Mumble reported its own native UTC
  heartbeat, `2026-10-08T23:54:48.297Z`, rather than the new snapshot time.
  The temporary process was stopped afterward.
- No container, firewall, DNS, provider, user-data, ping or retention setting
  was changed. No placeholder was substituted for a probe.

Files: root `compose.yaml` (`STATUS_SERVICES` only),
`portal/server/status-targets.mjs`, `portal/server/server.mjs`, and
`portal/tests/unit/status-targets.test.js`. The coordinated portal change also
corrects the bilingual status introduction to distinguish HTTP interfaces from
the limited Mumble listener observation.

Deployed on 9 October UTC in `public-utility-portal:0.1.0-content-20261009`;
only the portal was recreated. The prior image and private environment snapshot
are retained for rollback. The live private and public API snapshots contained
all 54 unique enabled IDs with no unknown observations. Both English and Spanish
pages rendered 57 rows: 54 enabled services and three listed-only services.
Neither page showed Not checked; Mumble retained its Degraded catalog state.
The production API still included Mumble's actual heartbeat timestamp.
Full portal lint/typecheck/build and all 92 unit tests passed after integration.
This verifies current coverage, not a promise that a future probe cannot fail.

## Added browser tools, 9 October

The newly deployed catalog includes Kokoro Web. Its HTTPS probe was present in Compose but initially omitted from the parser's exact-target allowlist; that omission was corrected and a targeted check covers all nine new static entry URLs plus rejected path/query/provider substitutions. No arbitrary-URL status fetch was introduced. Account services awaiting the separate edge retain maintenance notices rather than a claim of public readiness.
