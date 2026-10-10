# Penpot native file round trip, 9 October 2026

The installed Penpot 2.18.2 images passed a native `.penpot` export, import into a second fictional account, and editable browser reopen. This closes the basic design-file round-trip gap; it does not establish a full account, team or shared-library migration.

## What was checked

- Exact installed frontend/backend image digests from `deployment/expanded/compose.yaml`; no rebuilt or substituted application code.
- A new blank PostgreSQL database and assets directory, separate from production. The test network was internal; a temporary host-loopback TCP relay reached its frontend. SMTP, telemetry, external templates and external fonts were disabled only in this disposable configuration. Production settings, accounts, designs and identity-provider records were unchanged.
- Native temporary profiles, native file creation and native validated `update-file` created a named 240 × 160 blue rectangle on a page. The native `export-binfile` download produced a `.penpot` ZIP-format file; native multipart `import-binfile` imported it into the other profile's project.
- Native `get-file` confirmed the page, editable rectangle, name, position, dimensions and fill. The source profile was denied access to the imported copy with HTTP 404.
- Chromium opened the imported file, selected its layer, moved it one pixel with the native arrow-key action, and reloaded it. The server and reopened interface retained the edit (x=120 to x=121). There were no page exceptions or outside requests in this browser check.
- The reproducible checker deletes only its own two design files through native `delete-file`, then confirms both are inaccessible. Removing the disposable stack also discards every test profile, session, database and temporary asset.

The earlier export and isolation checks remain valid. The download/import menu labels are source-reviewed against the installed release; this check used the same native export/import RPCs, not an invented conversion format or custom import backend. No live SMTP or external invitation was used.

## Scope and omissions

This is one simple editable design on Penpot 2.18.2, imported into an independent account on the same compatible release. It does not test shared libraries, images, uploaded fonts, linked assets, components, comments, version history, account settings, team membership, permissions or sharing links. It does not establish compatibility with every older/newer Penpot release. Native visual SVG/PNG/PDF exports are separate from the editable `.penpot` archive.

No backup policy changed. Existing operator backups remain on this VM without configured automatic expiry; deleting active files does not rewrite earlier backups. This exercise is a user-file export/import test, not another operator-backup restore or off-site recovery test.

## Reproduce with fictional data

Prerequisites are the cached pinned images, Docker Compose, `socat`, Node and the repository's existing Playwright Chromium. The preparation script refuses to run below the existing 5 GiB free-disk floor. PostgreSQL uses a bounded RAM mount; the small synthetic assets use a private directory under `/dev/shm`. No production data path is mounted.

1. Run `python3 deployment/expanded/prepare-penpot-roundtrip.py`. It prints a new private report directory, project name, loopback port and RAM directory. Its generated Compose file contains random disposable credentials and is mode 0600. Do not publish it.
2. Start only that file: `docker compose -f "$report/compose.json" up -d --pull never`. Replace `$report` with the exact generated directory; do not use the live expanded-service Compose file.
3. Read this stack's frontend IPv4 address with `docker inspect "$project-penpot-frontend-1"`. Docker's internal network does not publish the requested port on this host, so run `socat TCP4-LISTEN:$port,bind=127.0.0.1,reuseaddr,fork TCP4:$frontend_ip:8080` in a foreground shell. The relay listens only on the VM's loopback address. Wait for `http://127.0.0.1:$port/readyz` to return 200.
4. Run `node deployment/expanded/check-penpot-roundtrip.mjs "$report"`. The checker verifies the unique test-project label, internal network and absence of production mounts before creating fixtures. It saves its native archive, screenshots and result privately; it never prints credentials.
5. Close the exact foreground `socat` process, then `docker compose -f "$report/compose.json" down --volumes`. Remove only the exact RAM directory from that report's `metadata.json`. Confirm this project's containers/network and relay listener are gone. Keep the private result/archive as evidence if needed; do not publish session files.

The native JVM compression library loads from `/tmp`, so this isolated backend uses an explicit executable RAM `/tmp`, matching its runtime need. Using Docker's default noexec temporary mount caused a harness-only native-library loading failure before export; it was corrected without changing production.

Private evidence for the performed check: `/opt/utilibre/reports/penpot-native-roundtrip-nkxnr45v/`. Public source recipes are `deployment/expanded/prepare-penpot-roundtrip.py` and `deployment/expanded/check-penpot-roundtrip.mjs`.

## Final evidence

The canonical checker passed at `2026-10-09T13:37:58Z`. Its 3,342-byte fictional archive has SHA-256 `0347e1bf4bcb47678287276e94fe4645efa4446377d8bbc336ab87da89d834fc`. Native deletion returned HTTP 204, followed by HTTP 404 when requesting each deleted file. `result.json` records the checked scope; `cleanup.json` confirms removal of all four test containers, the isolated network, loopback relay and RAM state at `13:38:48Z`. Existing live Penpot containers were never restarted.

The two verification scripts pass syntax checks; portal TypeScript validation and scoped whitespace checks pass. Free disk remained about 6.4 GiB; no backup, rollback image or production cache was removed.
