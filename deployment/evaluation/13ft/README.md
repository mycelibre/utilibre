# 13ft restricted fixture evaluation

This is a stopped, unpublished evaluation, not an arbitrary-URL service. The only accepted origin is the owned fictional fixture at `http://172.29.100.20:8081`, on the isolated evaluation network. Do not add public ports or replace the literal allowlist with arbitrary user URLs. See [the review](../../../docs/13ft-review.md).

## Pins and reproduction

- Original upstream: <https://github.com/wasi-master/13ft>, MIT, tag `v0.5.0`.
- Commit: `d03b120c41d2558d3ce2a45e049ccbea8785ff7a`.
- Unmodified `app/portable.py` SHA-256: `a717850a202ce5d079c81d90923659cd54252e980ce310b993b03a8764a8d731`.
- Restricted patch SHA-256: `16d088ad53339a0c6c75123370d6db655a9843f45fccb269747a5091eb32397d`.
- Tested image ID: `sha256:289cc6cc53d120cba5ea8e59c4ad8abd30bcd78a00a66c201632d3708954c578`.
- Python and Nginx base images are digest-pinned in the files. `requirements.lock` fixes the Python dependency versions; it is not a dependency security certification or a promise of bit-identical package artifacts.

`prepare.sh` verifies the upstream revision, exports only committed source into a new private build directory, applies the reversible patch, and builds the image. It never modifies the upstream checkout. It requires an existing checkout and a new build directory:

```sh
./deployment/evaluation/13ft/prepare.sh /opt/utilibre/evaluation-src/13ft /private/new-13ft-build
```

Check that `172.29.100.0/24` remains unused before starting. There are no ports, production networks, durable data volumes, credentials or automatic restarts in this Compose project:

```sh
docker compose -f deployment/evaluation/13ft/compose.yaml config --quiet
docker compose -f deployment/evaluation/13ft/compose.yaml up -d
/path/to/test-venv/bin/python deployment/evaluation/13ft/check-pilot.py /private/13ft-report
node deployment/evaluation/13ft/check-pilot-browser.mjs /private/13ft-report
docker compose -f deployment/evaluation/13ft/compose.yaml down
```

The Python test environment needs `requests`; the browser check reuses the portal's installed Playwright. The integration test deliberately causes one Gunicorn worker timeout and validates recovery. It uses only fictional local data. Keep reports private and use a new empty report directory. A second test can be rate limited if started immediately after the burst; allow the two-requests-per-second bucket to refill.

## Upstream-only findings

`check-native.py` exercises unmodified upstream in a fresh network namespace without a default route. It starts a temporary fictional loopback server; fallback-provider calls are mocked. Never run this test against production content:

```sh
unshare --net sh -ec 'ip link set lo up; UTILIBRE_OFFLINE_13FT_CHECK=1 /path/to/test-venv/bin/python deployment/evaluation/13ft/check-native.py /opt/utilibre/evaluation-src/13ft /private/13ft-report'
```

`check-rendered.mjs` demonstrates native script execution and illustrative CSP protection using the captured fictional HTML. Every browser request is intercepted; outside requests are aborted. This earlier evidence script uses the dated private report location in its source. `check-pilot-browser.mjs` is the final configurable integration check of the actual restricted gateway.

## Boundaries and cleanup

The patch uses the native POST renderer. Native SSE jobs, GET fetches and cached reads are inaccessible; the cache and job count remain zero through the pilot routes. It rejects every URL outside six exact fixture paths, disables redirects and external fallbacks, uses system fonts, limits incoming bodies to 4 KiB and decompressed source bodies to 1 MiB, and removes meta refresh. The application checks an eight-second read deadline between chunks; the two synchronous Gunicorn workers' 12-second timeout also stops slow trickles that never complete a chunk. Killing a timed-out worker discards its in-memory request; the master replaces it.

The gateway allows two concurrent requests globally and two requests/second/client with a burst of four. Article CSP disables scripts, forms, frames, source assets and base URLs; CSP is not presented as complete HTML sanitization. Root-page scripts are also disabled and the modified native form submits without JavaScript. Each container is read-only, non-root, drops capabilities, uses no-new-privileges and has CPU/RAM/PID ceilings. The internal IPv4-only Docker network has no default route. The fixed literal origin means no submitted hostname resolution occurs.

Access logs are disabled in this isolated configuration. Critical operational diagnostics use Docker's local log driver, rotated by size (`1m`, two files), not a promised time period. There is no source-page cache, persistent database or backup. Test reports contain fictional data only. `compose down` removes the containers/network and their ephemeral state; preserve or delete private reports according to the existing operational workflow.

The source patch is registered in `deployment/source-patches.json`. It applies and reverses against the pin. Removing the evaluation needs only `compose down`; no live service configuration was changed. The local image may be removed by its unique tag when no longer needed. No public DNS record, portal listing or root Compose entry exists.
