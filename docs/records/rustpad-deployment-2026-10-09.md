# Rustpad deployment review, 2026-10-09

Upstream: https://github.com/ekzhang/rustpad, immutable source `54e4a9383c84d7317af42a7ddb177ce8bcba058d` (2025-02-02), MIT. Upstream has no tagged release or published project security advisory at the review time. That is not a guarantee that the application has no vulnerabilities.

## Deployment and data model

The installed `utilibre-rustpad:54e4a93-p1` image contains the native Rust service and its locally built frontend. `deployment/rustpad/compose.yaml` gives it one CPU, 512 MiB RAM, 64 PIDs, a read-only root, no added capabilities, and the internal `172.29.141.0/24` network. Backend address: `172.29.141.10:3030`. There is no published backend port, outbound network, account integration, database, filesystem state volume, or document backup. Only the OmniTools gateway may join that network and proxy `/apps/rustpad/`; other toolbox gateways keep their existing configuration. `omnitools-location.conf` preserves native WebSockets and permits locally bundled Monaco workers/WASM in its scoped CSP.

Anyone holding a document identifier can read/edit its text and retrieve the native raw-text endpoint. Names are unverified display names. Browser-created links use 128 random bits from Web Crypto; manually chosen predictable identifiers are still possible and should not be encouraged. This is a capability link with the same read/edit access for all holders, not an account permission system or encrypted vault. The server receives plaintext document text, operation history, names and cursor positions. TLS protects transport, not content from the operator or other participants. No visitor analytics or third-party editor CDN is enabled.

`SQLITE_URI` is absent. Native `socket_handler` updates `last_accessed` when a WebSocket connects. The cleaner checks hourly and removes a pad once that connection timestamp is older than 24 hours: approximately 24–25 hours after the last connection, including when existing editors remain open. Edits and raw-text GET requests do not refresh the timestamp. Any restart loses all pads. This differs from the upstream README's informal “inactivity” wording and is stated explicitly in the public notes. There is no per-pad permanent-delete API. Clearing current text leaves earlier operations in memory until cleanup/restart; collaborators can retain copies. Immediate memory erasure is not promised. Browser localStorage retains name/color/theme preferences; closing a tab does not clear them or downloaded files.

The native service has small added resource checks: 64 documents, 128 live WebSockets, 256 KiB of UTF-8 text per pad, 4,096 edits or 1 MiB of serialized operation history per pad, 1 MiB WebSocket message/frame limits, 100 client messages per second, and bounded name/language/cursor metadata. Rejected edits preserve the last server-accepted document. They can leave unsent changes only in the browser, so the guide says to save a local copy before opening a new session. These are protective ceilings, not a measured capacity guarantee.

Local gateway access logging is off; application log level is `error`. Docker logs rotate at 1 MiB per file with two files per container, a size limit rather than a retention duration. Existing edge, infrastructure and system/security logging is separate. No existing service retention or backup policy changes.

## Reproducible maintenance

`apply-patches.py` asserts the upstream text before applying each change. Changes cover generated link entropy, subpath sharing, local editor workers, brief data/navigation links, resource limits and compatible dependency maintenance. Native OT/collaboration logic and expiry semantics remain upstream. `bounds-unit.rs` and `bounds-integration.rs` add focused regression tests. The upstream stress test retains its 200 ms response assertion and only gains pacing to remain below the new 100-message/s service limit.

`rebuild.sh` checks out the exact source and uses the recorded Rust/JavaScript lockfiles. Rust 1.99.0 Alpine image is digest-pinned; wasm-pack 0.15.0 is fetched from its official release with a SHA-256 check. Native compilation uses two CPUs, 4 GiB memory and a 2.3 GiB executable tmpfs target, avoiding a multi-gigabyte permanent target directory. Only the final binary, WASM package, frontend and source recipe need persist. Never prune unrelated images, shared caches or backups to build this app.

## Dependency review

Original Cargo lock audit: eight advisory records, involving bytes, h2, idna, libsqlite3-sys, two ring versions, rustls and sqlx. Compatible updates to Warp 0.4, SQLx 0.8 with SQLite-only features, and related libraries address the compiled dependencies. The updated whole-lock audit still reports `rsa 0.9.10` / [RUSTSEC-2023-0071](https://rustsec.org/advisories/RUSTSEC-2023-0071.html), which has no fixed version. `cargo tree -p rustpad-server --edges normal` contains neither `rsa` nor `sqlx-mysql`/`sqlx-postgres`; RSA belongs to SQLx's unused optional MySQL dependency and is not compiled into this SQLite-only service. Do not present the whole lockfile as having zero advisories.

The original browser-production dependency audit reported two moderate advisories: `@babel/runtime` and `yaml`. Lockfile maintenance fixes those. A compatibility transformer then failed with current SWC; the build now targets native ES2022 top-level await instead, removing that transformer and its affected build-only UUID dependency. The final `npm audit` reports zero findings across all 213 resolved packages. Current browsers with WebAssembly, modules and native top-level await are required. This check does not guarantee absence of unknown vulnerabilities.

## Verification record

Private, fictional-only evidence is kept under `/opt/utilibre/reports/rustpad-20261009/`: source and dependency audits, native build output, compiled dependency graph and browser results. Source archives exclude runtime data, generated pad links, credentials and private evidence. The new public guide explains copying text to a local file and its omissions; it does not claim a native download/export interface that Rustpad lacks.

Completed checks:

- 18 native upstream/resource unit and integration tests pass, covering collaboration, Unicode, cleanup, native persistence compatibility, stress, metadata and users. Four additional service tests pass: 64-document capacity/release, 128-connection capacity/release, edits not renewing the connection-based expiry, and metadata/message-rate disconnects. The SQLite compatibility tests use disposable files; live persistence remains off.
- The actual release binary rejects a message beyond its 1 MiB boundary. An isolated private restart removes the fictional pads and returns zero documents/database records. No real user data was present or touched.
- A browser test uses two independent contexts through the actual subpath/proxy/CSP, types from each editor, verifies converged native raw text, changes syntax highlighting, exercises Copy, and confirms the 128-bit generated link. Seventeen browser HTTP requests stay on the instance origin, with no page errors or external asset requests. The local test uses the secure browser context naturally provided for localhost, not a browser security bypass; a temporary socat listener forwards to the private test gateway. The public HTTPS/WSS run passed at 04:09:49 UTC through Cloudflare and Caddy with two browser contexts, 16 same-origin HTTP requests, no external requests and no page errors. No production restart followed. Its unlisted fictional test pad is left to native expiry; no real user data is read or changed.
- Native frontend TypeScript and production builds pass. The deployment compose validates. Portal standalone catalog/guide typechecking is included in the root integration check.

Image ID: `sha256:fc150bbee49652cd2f71345652efd82ac70e5053350328ea4df36682154440f4`. There is no published port for the native service. The temporary test gateway and loopback listener were removed after public routing passed. Only the final memory-only backend and OmniTools gateway attachment remain.

## Recovery and rollback

There is intentionally no stateful backup/restore for these temporary pads. Verify restart loss only on an isolated fictional candidate before its route opens. Later production restarts require clear user-facing notice because every current pad disappears. Recovery is to start the pinned image again and have users paste their own independent text copies into new pads; history and permissions do not migrate. Roll back by restoring the previous OmniTools-only gateway config/network attachment and stopping this new container. Never restart unrelated services or delete user data to test recovery.
