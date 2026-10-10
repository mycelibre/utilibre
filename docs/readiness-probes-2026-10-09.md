# Five transient readiness failures, 9 October 2026

The portal's 16:03:40 UTC status snapshot marked CyberChef, WBO, Mapshaper,
Numbat and Super Productivity unavailable. This status means the probe raised
an exception; an ordinary HTTP error would instead be reported as degraded.
The snapshot does not preserve the exception, so its precise cause is unknown.

A bounded follow-up found no continuing application outage:

| Public host | Ordinary public HTTPS GET | Same native Node probe inside the portal |
| --- | --- | --- |
| cyberchef.utilibre.org | 200; CyberChef HTML | 200 in 150 ms |
| collab.utilibre.org | 200; WBO landing page | 200 in 134 ms |
| maps.utilibre.org | 200; Mapshaper HTML | 200 in 151 ms |
| calc.utilibre.org | 200; Numbat HTML | 200 in 252 ms |
| plan.utilibre.org | 200; Super Productivity HTML | 200 in 129 ms |

The public host requests used working IPv6 and returned application content,
not a challenge page. The 16:05:07 UTC container check used the same native
`node:https` GET and 2,500 ms socket timeout as the portal, against only these
five configured public roots. All used IPv4 successfully; lookup, connection
and TLS events completed. Each local origin also returned 200, including all
three distinct listeners in the shared static-app container. No board, saved
project, account or other user content was read.

At this checkpoint the portal launched all 92 readiness checks concurrently.
The next complete status snapshot, at 16:05:32 UTC, marked 17 services unavailable,
including private origin probes. That changing result prompted one instrumented
comparison inside the live portal container, using its exact configured-target
parser and allowlist:

| Sweep | Completion | Result |
| --- | --- | --- |
| 92 concurrent probes, 16:06:39 UTC | 2,621 ms | 91 operational; CyberChef socket timeout at 2,502 ms |
| Pool of six, 16:06:40 UTC | 460 ms | All 92 operational |
| Pool of six in a fresh Node process, 16:07:28 UTC | 1,611 ms | All 92 operational |

The failed request recorded no DNS lookup, TCP connection or TLS completion
event before its native 2,500 ms socket timeout. No HTTP error or challenge was
received. A separate 12-second diagnostic safety deadline did not fire. The
second sweep reused the same process and native agents. A final pool-of-six
sweep in a fresh Node process excluded reuse of those HTTP connections and also
passed all 92 targets. Container/host resolver caches may still have been warm;
the checks were sequential observations, not simultaneous controlled trials.
These observations support bounding the portal's probe fan-out; they do not
establish the precise DNS or operating-system cause.
There was no per-failure retry loop. Mumble's two fixed monitoring-API responses
were read only to reproduce its existing TCP-listener classification; no other
application body was inspected by this comparison.

A failed readiness probe alone does not establish that an application failed.
These checks verify delivery of the home page, not every application feature or
a capacity limit. Any subsequent portal implementation change is owned and
verified by the root integration task.

No application was restarted, no firewall or edge setting changed, and no
security restriction was relaxed. Diagnostic evidence is private under
`/opt/utilibre/reports/readiness-five-20261009/`: public headers and root HTML,
`summary.json`, `portal-probe-result.json`, `origin.json`, and the instrumented
`check-concurrency.mjs` / `concurrency.json` comparison. The fresh-process result
is `bounded-fresh.json`, reproduced by `check-bounded-fresh.mjs`. Probing stopped
after that check. The original
snapshot remains under `upstream-facts-20261009/status.json`.
