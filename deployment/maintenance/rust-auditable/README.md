# Auditable Rust maintenance builds

This is build-time inventory, not a runtime agent, telemetry, extra database or
invented Linux package list. The existing Rust applications keep their scratch
images, native privacy patches, resource limits and application configuration.

Build helper: [cargo-auditable 0.7.7](https://github.com/rust-secure-code/cargo-auditable/releases/tag/v0.7.7),
released 2026-10-02. Upstream offers MIT OR Apache-2.0; the bundled MIT notice is
retained here, and both bundled licenses remain in the build toolchain image.
Only its embedded dependency metadata, not the helper executable, enters the
application image. No external application requests or telemetry are added.

Official x86-64 Linux musl archive:
`https://github.com/rust-secure-code/cargo-auditable/releases/download/v0.7.7/cargo-auditable-x86_64-unknown-linux-musl.tar.xz`

SHA-256: `7676443367c5e33d9fb22acef63cccb5e9202de12dae1b0579995eb3e2bc7a18`.
The download was checked against both the official release API asset digest and
the separately published `.sha256` file on 2026-10-11. Dockerfile `ADD --checksum`
enforces this exact asset during future builds. Do not replace the pinned release
with an installer script that fetches whatever is latest.

## Staging

Run sequentially, from the repository root:

```sh
python3 deployment/maintenance/rust-auditable/stage.py chhoto
python3 deployment/maintenance/rust-auditable/verify.py chhoto
python3 deployment/maintenance/rust-auditable/check-chhoto.py
python3 deployment/maintenance/rust-auditable/stage.py rustpad
python3 deployment/maintenance/rust-auditable/verify.py rustpad
python3 deployment/maintenance/rust-auditable/check-rustpad.py
```

Each staging invocation makes a new private directory under
`/opt/utilibre/reports`, checks out the exact source and applies existing patches,
runs locked native release tests and an auditable build, and retains build/native
component evidence and a receipt. The compiler is capped at 2 CPUs, 3 GiB RAM
including swap, and 256 PIDs. Generated targets use a separate bounded 4 GiB
tmpfs under `/run/utilibre-rust-build`; at least 8 GiB RAM must be available before
allocating it. A disk watchdog stops its own build container below 8 GiB free.
Success unmounts only that invocation's volatile build target. Failed source/build
artifacts remain available for diagnosis; its own interrupted report directory
can be resumed with `--resume`. Never
prune unrelated data, images or shared caches as a side effect.

The staged overlay replaces only the native binary in the immutable previously
deployed image; all browser assets remain unchanged. Future complete source
builds use the same cargo-auditable step through the application Dockerfiles and
Rustpad's rebuild script. The full Rustpad source build writes
`utilibre-rustpad:54e4a93-auditable-full-20261011`, a separate candidate, never the
currently deployed `:54e4a93-p1` tag. It also rebuilds the frontend, unlike this
binary-only staged overlay; run its complete application gates before release.
Test the final image, not merely the source lock.

`check-chhoto.py` starts network-none candidates and uses only a newly created
fictional SQLite database. It checks anonymous creation, denied anonymous
listing/deletion, HttpOnly/SameSite=Strict native login, exact redirect, zero click counts,
expiry cap, online backup, restored redirect and deletion. Its disposable native
plaintext-password fixture is not production configuration; live Argon2 settings
are untouched. Production's existing nginx `proxy_cookie_flags` adds Secure;
the direct network-none fixture does not claim to retest that edge flag.
This native backup/restore fixture contains fictional data only. Production
Chhoto links are temporary: the same-source binary rollout does not create a
new retained backup of live temporary links or change their lifecycle.

The application image must retain `.dep-v0`, and Trivy must recover a nonempty
Rust inventory from the actual binary. Keep separate source-lock scans. Inventory
does not establish exploitability or cover every statically linked native
component automatically. Compiler/base digest, bundled libc hash, selected
dependency graph and SQLite version are retained separately; the builder package
list is explicitly **not** represented as the runtime package list.

Do not deploy or restart Rustpad automatically: its live documents are in memory
and restarting discards them. Root/operator owns coordinated maintenance and the
existing copy/notice instructions. Neither staging command modifies Compose,
restarts a live container, reads live pads or mounts a live data directory.

## Completed candidate evidence

Chhoto completed at 21:43 UTC on 11 October 2026:

- Candidate `utilibre-chhoto:7.8.3-auditable-20261011`, image
  `sha256:c86c860a692ba503eae2a48bc7c4ad221f7b9d00b7fb158fa8d04b69717a535a`.
- Same source and lock; 22 native tests passed. Binary SHA-256
  `14a2288609567ea2a511c7ecad0b5dc3ceec2744eb60c9293ed234a7ccc803bc`;
  9,669,392 bytes, including the retained `.dep-v0` section (3,328 bytes larger
  than the previous application binary).
- Trivy recovered **204 actual compiled Rust packages**, with no reported
  vulnerabilities in that inventory using the cached 11 October database.
  All 18 non-binary files and the runtime configuration remained identical.
- Native synthetic creation, authentication/access denial, redirect, expiry,
  zero counters, online SQLite backup, restored retrieval and deletion passed.
- Build receipt: `/opt/utilibre/reports/chhoto-auditable-edbwza62/receipt.json`.
  Inventory receipt: `/opt/utilibre/reports/chhoto-auditable-inventory-clbhc6mp/result.json`.
  Native receipt: `/opt/utilibre/reports/chhoto-auditable-native-ygoikkqd/result.json`.
- Toolchain rustc 1.96.0 / LLVM 22.1.2; bundled SQLite header 3.53.2. The actual
  linked toolchain `libc.a` SHA-256 is
  `e699c64b0c6b427d89ad5bf767bf78beb30c19930c5dedff635951636e8f9f70`.
  This native provenance is separate from the crate vulnerability scan.

These are candidate checks, not a claim of production rollout. The coordinating
maintainer owns the live-image release receipt, backup and rollback. Revert the
individual Compose image to its retained predecessor if a release regression is
observed; retain state and do not restore an older database over newer writes
without a separate recovery decision. Rustpad's in-memory data caveat applies
to rollback as well as upgrade.

Subsequent release confirmation: the coordinating maintainer deployed Chhoto;
an independent container-image check at approximately 21:59 UTC confirmed
`utilibre-chhoto-app-1` runs the exact candidate ID above. This check establishes
the running image identity, not a new live user-data or restore test.

Rustpad completed at 21:55 UTC on 11 October 2026:

- Candidate `utilibre-rustpad:54e4a93-auditable-20261011`, image
  `sha256:d184dcaf6a85dcb2f75e7e0496588a9ff44ba0335505a132943b46ebce522ada`.
- Same source and lock; **23 native tests passed**, including collaborative
  transformation, SQLite persistence, expiry and configured resource bounds.
  The final server-only selected-feature build excludes MySQL and `rsa`; the
  separately recorded whole-lock RustSec RSA finding is not broadly waived.
- Binary SHA-256
  `40138411650cd58a59d26748438569577b7921aad8245ac57e36cabc12256e22`,
  7,641,880 bytes; `.dep-v0` present. Trivy recovered **191 compiled Rust
  packages**, with no findings in that inventory. All 99 non-binary files and
  runtime configuration remained identical.
- Two independent headless Chromium clients edited the same fictional pad,
  including copied subpath sharing, language selection and native raw-text
  retrieval. Oversized WebSocket input was closed; 16 same-origin browser
  requests, zero third-party requests and zero runtime errors were observed.
  This was an isolated network-none application plus loopback test gateway, not
  real-device testing or a production restart.
- Build receipt: `/opt/utilibre/reports/rustpad-auditable-jheembbi/receipt.json`.
  Inventory: `/opt/utilibre/reports/rustpad-auditable-inventory-0uw2a_xo/result.json`.
  Browser/frame gate: `/opt/utilibre/reports/rustpad-auditable-native-v35xaslq/result.json`.
- rustc 1.99.0 / LLVM 23.1.1; actual toolchain `libc.a` hash matches the value
  recorded above. Bundled SQLite header is **3.46.0**. This older native SQLite
  remains a separate native-component review item; a zero-finding Rust crate
  scan does not prove it free of SQLite CVEs. No fake runtime APK inventory was
  added to make that gap disappear.

At release coordination, the native aggregate stats reported one live,
memory-only Rustpad document. No document IDs or content were inspected. Its
production activation must wait for native expiry/zero active documents or a
separate safe maintenance decision; this staged binary is not the running
binary until the coordinating maintainer records an actual rollout.
