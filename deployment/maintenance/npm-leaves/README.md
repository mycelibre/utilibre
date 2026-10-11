# Bounded Kuma and Actual dependency overlays — 11 October 2026

These are same-application-version runtime dependency repairs plus a narrow
Actual privacy fix, not new features, frontend rewrites, schema changes or
authentication changes. No analytics,
telemetry, external runtime asset provider or service was added. Actual remains
26.10.0; Kuma remains 2.5.6. Their exact immutable predecessor IDs are asserted
by `stage.py` before building. Root coordinates the live release and backup.

## Sources and compatibility

Packages come from their official npm registry artifacts, with exact integrity
hashes and transitive versions retained in each `package-lock.json`. Lifecycle
scripts are disabled. Registry metadata was checked on 11 October 2026.

| Component | Selected version | Official source | License |
| --- | --- | --- | --- |
| Axios | Kuma 0.34.0 / Actual 1.20.0 | https://github.com/axios/axios | MIT |
| ws | Kuma 8.21.3 | https://github.com/websockets/ws | MIT |
| mysql2 | Kuma 3.23.1 | https://github.com/sidorares/node-mysql2 | MIT |
| LiquidJS | Kuma 10.27.2 | https://github.com/harttle/liquidjs | MIT |
| lodash | Kuma nested 4.18.1 | https://github.com/lodash/lodash | MIT |
| minimatch | Kuma 9.0.7 | https://github.com/isaacs/minimatch | ISC |
| glob | Kuma nested 10.5.0 | https://github.com/isaacs/node-glob | ISC |
| brace-expansion | 2.1.7 / Actual npm copy 5.0.11 | https://github.com/juliangruber/brace-expansion | MIT |
| ip-address | npm copy 10.7.2 | https://github.com/beaugunderson/ip-address | MIT |
| picomatch | Kuma npm copy 4.0.4 | https://github.com/micromatch/picomatch | MIT |
| body-parser | Actual 2.3.0 | https://github.com/expressjs/body-parser | MIT |
| qs | Actual 6.16.0 | https://github.com/ljharb/qs | BSD-3-Clause |
| Undici | Actual npm copy 6.28.1 | https://github.com/nodejs/undici | MIT |
| tar | Actual npm copy 7.5.22 | https://github.com/isaacs/node-tar | ISC |

The reviewed versions remain on the installed major branches. Existing newer,
unaffected copies are preserved. `replace.cjs` asserts each exact old version,
replaces its physical directory, and uses the locked tree for dependency
resolution. It does not leave stale package directories behind a replacement
symlink. Actual needs separate brace-expansion major 2 and major 5 packages; the
explicit npm alias preserves that distinction. Required package notices remain
inside their installed artifacts.

The npm-bundled fixes address the package manager's included dependencies, not
proof that the application used those libraries in a user-facing request. The
application and precompiled browser bundles are not rebuilt. `verify.py` hashes
all application files outside dependency trees, including Actual's web build.
Kuma must match exactly; Actual permits only the four exact-hash privacy changes
recorded below and rejects any unrelated byte change.

## Actual privacy finding and repair

The direct native browser test found unsolicited requests to GitHub's release
API and raw news feed. This was not merely a fixture missing production headers:
the public service's 22:01 UTC response had `connect-src http: https:`. Per-browser
notification display preferences do not provide the required instance-wide
policy. The pinned upstream source has no server-wide off-switch for those two
browser fetch functions.

`actual-privacy.cjs` asserts the original SHA-256 and unique edit target for each
26.10.0 file. It changes only:

1. The native `fetchNewsFeed` result to an empty valid schema, without fetching.
2. The native `getLatestVersion` result to `unknown`, without fetching. Operator
   maintenance checks still handle upstream release monitoring.
3. The existing server CSP's connection destinations to `'self'` and the existing
   `https://auth.utilibre.org` identity origin. Remote custom-theme fetches and
   switching this installed frontend to unrelated remote servers are not
   supported by this restricted deployment. Budget import/export and native
   same-origin sync APIs remain available. No account or OIDC setting changes.
4. Native Workbox precache revisions for both changed JS chunks **and** the index
   response, so the old broad navigation CSP is refreshed too. No browser data,
   account budget or app database is deleted. Already-installed clients need the
   upstream update/reload lifecycle; this does not retroactively modify a tab
   that is still executing old code.

The four changed-file hashes are retained inside the image at
`/opt/utilibre-reviewed-leaves/privacy-patch.json`. Sourcemaps remain original
upstream diagnostic source, not executable code. Re-review this small patch for
every new app release; mismatched source fails the build rather than silently
rewriting unknown code. Fresh-profile native tests require **zero attempted
external browser requests**, not just a successful CSP block. An old installed
worker's update lifecycle was not exercised end to end in this release gate.

Upstream source: [Actual 26.10.0](https://github.com/actualbudget/actual/tree/v26.10.0),
[server response policy](https://github.com/actualbudget/actual/blob/v26.10.0/packages/sync-server/src/app.ts).

## Reproduce and verify

Run sequentially from the repository root. Builds require 8.3 GiB free and stop
below an 8 GiB disk floor. Builds perform locked package installation only; no
compiler or native package lifecycle scripts run. Isolated native checks use
one CPU and at most 1 GiB RAM. No production data volume is mounted in Actual.

```sh
python3 deployment/maintenance/npm-leaves/stage.py kuma
docker run --rm -i --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 512m --cpus 1 --log-driver none \
  --tmpfs /tmp:rw,nosuid,size=32m --entrypoint node \
  utilibre-kuma:2.5.6-leaves-security-20261011 - \
  < deployment/maintenance/npm-leaves/check-kuma.cjs
KUMA_CHECK_IMAGE=utilibre-kuma:2.5.6-leaves-security-20261011 \
  python3 deployment/maintenance/check-kuma-slim.py
python3 deployment/maintenance/npm-leaves/verify.py kuma
python3 deployment/maintenance/npm-leaves/stage.py actual
docker run --rm -i --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 256m --cpus 1 --log-driver none \
  --tmpfs /tmp:rw,nosuid,size=32m --entrypoint node \
  utilibre-actual:leaves-security-20261011 - \
  < deployment/maintenance/npm-leaves/check-actual-leaves.cjs
python3 deployment/maintenance/npm-leaves/check-actual.py
python3 deployment/maintenance/npm-leaves/verify.py actual
```

Kuma's existing checker takes a native SQLite backup of operator monitoring
configuration and disables all polling only in its network-none clone. It checks
the restored status page and native operator login without printing credentials
or monitor destinations. The new leaf checks exercise loopback Axios and
WebSocket traffic, Liquid variables, native SQL escaping, globbing, IP parsing,
brace expansion and prototype-property behavior. Existing protobuf/tar/gRPC,
Node, SQLite, badge and route-boundary gates remain part of the prior 2.5.6
release; these unchanged libraries are not credited as new exhaustive tests.

Actual's check bootstraps only a new tmpfs-backed, network-none server. Browser
access goes through a loopback-only namespace forwarder. It checks native
password login, a fictional budget/account and 125.50 balance, native ZIP
export/import, reload, server synchronization/download and anonymous denial.
Its native OIDC production setup and external bank providers are not touched or
claimed tested. Separate library checks exercise valid, malformed and oversized
JSON, URL-encoded data, loopback HTTP, IP/brace parsing and tar extraction.

## Candidate evidence and remaining scope

Final Kuma candidate: `utilibre-kuma:2.5.6-leaves-security-20261011`,
`sha256:8d78c4ea077c0be5e7407343a405caa613bffa4b0185df671cde75d1f522eb77`.
Native restored login/status passed at 21:58:56 UTC; the clone contained 59 HTTP
and one TCP monitor definitions, all disabled only in the disposable clone.
943 application/asset files and runtime settings were identical. Final inventory
receipt: `/opt/utilibre/reports/kuma-leaves-inventory-sqwmfksl/result.json`;
native receipt: `/var/lib/utilibre-maintenance/kuma-256-leaves-20261011/result.json`.
The coordinating maintainer subsequently confirmed this exact Kuma image live,
healthy, with public status HTTP 200 and administrative public routes still 404.

The final Kuma scan retained 4 critical / 103 high occurrences: 94 critical/high
Debian occurrences, nine JavaScript highs and four highs in bundled cloudflared.
Unfixed vendor findings and major-version-dependent JavaScript repairs are not
waived or described as safe. Installed but unused libraries remain inventoried.
No vulnerability suppression was added. Counts are occurrences in this scanner's
cached database, not confirmed exploitability or guarantees of future safety.

Final Actual candidate: `utilibre-actual:leaves-security-20261011`,
`sha256:6859a1cb16fef5f0abc06c4dd4828160dda1157b01c39b6a0751efd7fdfb7a61`.
The final native journey passed at **22:06:00 UTC**: sign-in, a real synthetic
budget with a 125.50 account, 29,517-byte native ZIP export and reimport, reload,
native synchronization/download and anonymous denial. Zero outside browser
request attempts and zero page errors were observed on the clean Chromium
profile. The narrowed CSP and all three native precache revision changes were
checked. Prior failure evidence for the original external requests is retained;
the successful report does not silently relabel those requests as acceptable.

Final Actual hash check at 22:06:07: 247 application/asset files unchanged and
exactly four explicitly reviewed privacy-patched files. Runtime container
configuration is unchanged. The image scan retains **1 critical / 52 high**:
51 critical/high vendor Debian occurrences and two JavaScript high occurrences
for `http-cache-semantics` without a fixed version in the cached database.

- Native: `/opt/utilibre/reports/actual-leaves-native-64d7sh7q/result.json`.
- Inventory: `/opt/utilibre/reports/actual-leaves-inventory-j7tcagcm/result.json`.
- Build: `/opt/utilibre/reports/actual-leaves-bevewqzv/receipt.json`.

The coordinating maintainer deployed Actual. An independent image check at
22:12 UTC found `utilibre-expanded-actual-1` healthy on the exact final ID above;
that identity check is separate from the isolated workflow tests. Real devices,
production OIDC sign-in, an old installed worker's update, external bank
providers and broad malicious-input coverage were not tested. All diagnostics
and synthetic ZIPs remain outside the public repository. Python syntax, Node
syntax and scoped Git whitespace checks passed.

## Release and rollback

Only the coordinating maintainer changes Compose after successful gates and the
normal native pre-release backup. Kuma can roll back to its exact predecessor in
`stage.py`; preserve the current data volume. **Do not roll Actual back to its
unmodified predecessor:** that would re-enable the confirmed unsolicited update
and news requests and broad connection CSP.

`Dockerfile.actual-rollback` prepares the exact old Actual dependency tree with
the same four-file privacy repair, without downloading or replacing libraries.
Build it with `python3 deployment/maintenance/npm-leaves/stage.py actual-rollback`,
then run `python3 deployment/maintenance/npm-leaves/check-actual.py --image
utilibre-actual:privacy-rollback-20261011` and
`python3 deployment/maintenance/npm-leaves/verify.py actual-rollback`. The latter
checks every file in `/app`, including all dependency directories, allowing only
the four privacy changes. The coordinating release must bind this rollback
image's verified immutable ID explicitly. If a verified privacy-preserving
rollback is unavailable, stop the affected service rather than restore the
unpatched image.

No schema migration or account/retention change is intended. Do not overwrite
newer saved work with an old backup as a routine rollback. Rebuilt images must
be rescanned and retested before release; never replace a running release tag
silently. A dependency rollback restores the predecessor's known security
findings; it is an emergency compatibility option, not a security improvement.

The privacy-preserving Actual rollback was built and tested at 22:12 UTC:
`utilibre-actual:privacy-rollback-20261011`, immutable ID
`sha256:a5d3ae8053d03188148239fe68a54116d7c5b6a36cdef3485a0a8e385cf382b3`.
Its native login, fictional budget, 29,548-byte ZIP export/import, reload,
synchronization/download and anonymous denial passed with zero external browser
requests and page errors. 11,082 application/dependency files were identical to
the old predecessor; only the same four privacy-patched files changed. Runtime
settings were identical. Its scan retains the old dependency findings:
1 critical / 71 high occurrences. The live service was not rolled back.

- Native: `/opt/utilibre/reports/actual-leaves-native-v8nhuy7v/result.json`.
- Inventory: `/opt/utilibre/reports/actual-rollback-leaves-inventory-kjtqf030/result.json`.
- Build: `/opt/utilibre/reports/actual-rollback-leaves-f1vyg12u/receipt.json`.
