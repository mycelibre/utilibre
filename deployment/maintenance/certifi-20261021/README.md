# October 21 Python dependency repairs

Finite, operator-invoked overlays, not a package updater or a scheduled release.
`specs.mjs` pins the twelve original image IDs, Python/site-packages locations,
runtime roles, certifi wheel and temporary pip wheel. The original application
code, other dependency files, image configuration and previous patches must
remain unchanged. Downloads are HTTPS with pinned SHA-256; installation and
native verification run without network access, production credentials or data.

Implemented and deployed:

- certifi **2026.10.19**, twelve images / fifteen runtime roles. Removal of the
  compromised emSign ECC Root CA - G3 is checked alongside valid TLS, wrong
  trust rejection and preservation of other trust anchors.
- Pillow **13.0.0**, Candlr, LiberaForms, KitchenOwl and TRIP. The old native
  JPEG tile overflow is reproduced in a capped disposable process with core
  dumps disabled; repaired handling and ordinary JPEG/PNG/WebP transformations,
  alpha and orientation metadata are checked.
- uv **0.13.4**, BeaverHabits' bundled installer. Offline native CLI checks,
  unchanged application environment and the embedded-CA advisory scan gate.
- aiohttp **3.14.4** and its required yarl **1.25.1**, BeaverHabits,
  LiberaForms, KitchenOwl and Authentik's two runtime roles. Native JSON,
  ordinary form and compressed WebSocket checks; the baseline reproduces the
  control-frame-before-data failure, while the candidate succeeds. A bounded
  1001-field fixture changes from acceptance to HTTP 413; a subsequent valid
  request still succeeds. This is not a reproduction of every aiohttp advisory.

Public sources: [certifi advisory](https://github.com/advisories/GHSA-6q48-6c7w-9gw2),
[Pillow](https://github.com/python-pillow/Pillow/releases/tag/13.0.0),
[uv](https://github.com/astral-sh/uv/releases/tag/0.13.4),
[aiohttp release](https://github.com/aio-libs/aiohttp/releases/tag/v3.14.4),
[resource-bounds advisory](https://github.com/aio-libs/aiohttp/security/advisories/GHSA-2g87-pp6c-29x5),
[yarl release](https://github.com/aio-libs/yarl/releases/tag/v1.25.1).
Upstream licenses remain MPL-2.0 (certifi), HPND (Pillow), MIT/Apache-2.0
(uv), Apache-2.0/MIT (aiohttp), Apache-2.0 (yarl) and MIT (pip).

## Rebuild and release boundaries

Run from the repository root. Each command takes explicit keys from the finite
specification; it does not discover and automatically approve other services.
Build CA candidates with `build.mjs KEY...`, then `scan.mjs KEY...`.
Pillow/uv/aiohttp use their named builder and `scan.mjs --pillow|--uv|--aiohttp`.
Pillow and uv build on the CA receipt. aiohttp builds on the completed
Pillow/uv overlay where applicable, preserving that repair.

`release.mjs prepare[-pillow|-uv|-aiohttp] KEY...` binds the exact candidate,
existing configuration, companions, native health and a bounded public route
check. It does not deploy. `apply...` is a **separate authorized production
action**; it updates only image pins and reuses existing Compose/supervisor
paths. It preserves namespace/firewall constraints and checks the same route
status. A failed gate restores the previous pin and scoped runtime; it never
restores, deletes or migrates user data. Repeating a passed release verifies
the image without restarting it. Eight GiB of filesystem reserve is required.

Retained private evidence: `/var/lib/utilibre-maintenance/certifi-20261021/`.
Each key has build, native observations, scan and release receipts. These bind
image IDs, package hashes, all changed dependency paths and advisory snapshot;
they are not public logs. A candidate scan rejects newly introduced high or
critical findings, but does **not** claim that unrelated findings are resolved.
Rebuilding from pinned inputs is supported; identical build bytes are not
claimed. Existing completed receipts are not approval for a different input.

The SimpleLogin public route was already HTTP 502 before this batch, while its
native login gateway returned HTTP 200. These dependency fixes do not establish
that the separate edge route has been repaired. No mail-delivery test was sent.

SearXNG's daily updater now verifies candidate CA behavior and recognizes only
the exact reviewed local image. It must not replace the local repair with an
upstream candidate that still contains the compromised trust anchor.
