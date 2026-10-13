# Scratch Rust inventory review — 2026-10-11

The initial read-only investigation and source-lock addition are recorded below;
the subsequent auditable rebuilds are documented in
[the build and native-test evidence](rust-auditable/README.md). No scanner
exception or vulnerability suppression was introduced. The original fleet scan
started at 21:17:18 UTC and completed at 21:18:50 UTC using Trivy 0.75.0 and its
2026-10-11 13:06 UTC database.

## Findings

Both final Dockerfiles explicitly use `FROM scratch`. The runtime images contain
the compiled application and static frontend, not their builder's Alpine package
database. Absence of a runtime distro is expected. Absence of a compiled Rust
dependency inventory is a real coverage gap: both image scans inventoried zero
packages, so their zero vulnerability counts are **not a clean bill of health**.

| Application | Exact inspected image | Binary SHA-256 | ELF observations |
| --- | --- | --- | --- |
| Chhoto 7.8.3-p3 | `sha256:3efe81f9733cdac5b712c17b14e995f083adc0d7577cb7098425f936389051af` | `15b6b557494dac2e8387dc73ee6fa53a119dc2851aedcb2a3789a6c16f339b57` | 9,666,064 bytes; x86-64 static PIE; stripped; rustc 1.96.0 |
| Rustpad 54e4a93-p1 | `sha256:fc150bbee49652cd2f71345652efd82ac70e5053350328ea4df36682154440f4` | `672ae859d4d7185138f64a9ed99895149e679e0c5865df482f686a38ef4dbeec` | 7,642,872 bytes; x86-64 static PIE; not stripped; rustc 1.99.0 |

`file` and `readelf -lW/-dW/-SW/-p .comment` were run on binaries copied from
temporary, never-started containers created from these exact immutable images.
Neither ELF has an interpreter segment, a `NEEDED` shared-library entry, or a
`.dep-v0` cargo-auditable section. Temporary containers and extracted binaries
were removed; no live application volume was mounted. Static linkage does not
remove the need to review linked libc, native SQLite, Rust standard library, or
application dependencies.

### Chhoto

- Source: [SinTan1729/chhoto-url](https://github.com/SinTan1729/chhoto-url/tree/e18a8a0111e94be03145e95c30dcd7f41891633d),
  commit `e18a8a0111e94be03145e95c30dcd7f41891633d`.
- `deployment/chhoto/build.py` starts from this revision, applies the two recorded
  source patches and verifies vendored frontend hashes. Its Dockerfile runs
  `cargo test --locked` and `cargo build --locked --release`.
- Builder: `rust:1.96.0-alpine3.23@sha256:5dc2af9dd547c33f64d5fc1d299ab93b51f39eaa16c426c476b990ce6caf5b3e`.
  Additional build packages are currently resolved by `apk add build-base`.
- The source `backend/Cargo.lock` contains 259 locked packages and hashes to
  `a9a1cef499e5e8edc56efb445210189b4ed664359f369fffcec76e35ab2e0f0d`.
  The on-disk lock exactly matches the pinned Git object. It was outside this
  repository's tracked manifests and missing from the 21:18 fleet scan. The exact
  unmodified lock is now staged under `chhoto-source/Cargo.lock`, with source
  provenance and the upstream MIT license. The existing scheduled scanner's
  `git ls-files` selection now includes it; no scanner exception was added.
- Targeted Trivy filesystem check completed at **21:23:15 UTC**: **259 packages
  inventoried, zero reported vulnerabilities** with the existing database. Full
  private result: `/opt/utilibre/reports/chhoto-source-20261011/trivy.json`, SHA-256
  `73d21254aae7eda91946e6a60d8ab39f78a6e05dbb93f4ff0cde241c0b689f14`.
  This closes the missing scheduled source-lock coverage, not binary provenance
  or comprehensive runtime clearance. The full fleet scan was not repeated.
- Its manifest explicitly uses bundled SQLite through `rusqlite`. A crate list
  alone does not establish complete coverage of all compiled native components.

### Rustpad

- Source: [ekzhang/rustpad](https://github.com/ekzhang/rustpad/tree/54e4a9383c84d7317af42a7ddb177ce8bcba058d),
  commit `54e4a9383c84d7317af42a7ddb177ce8bcba058d`, plus the existing asserted
  patches, resource tests and tracked Cargo/JavaScript locks.
- Builder: `rust:1.99.0-alpine3.24@sha256:0cce0a5e0e8ba67b455257a3a02a1d99005f382748789d6464460028810f1627`.
  `rebuild.sh` runs locked native tests/build and the pinned, checksummed wasm-pack
  0.15.0 build. Additional builder packages are currently resolved through apk.
- The current source-lock scan covers 266 Cargo packages and 112 JavaScript
  packages, reporting zero findings with this Trivy database. Cargo lock hash:
  `e35435b0049e3de61aa08a3f10288626e53ec242af2d72222a33f920f7539a25`.
  This is **source-input coverage**, not recovered binary provenance.
- Do not erase the separate native RustSec result: the October 9 whole-lock audit
  reports `rsa 0.9.10` / `RUSTSEC-2023-0071`. The earlier native dependency-graph
  review excludes optional MySQL/RSA from the SQLite-only server build. See
  [the deployment evidence](../../docs/records/rustpad-deployment-2026-10-09.md). A new
  build should regenerate that selected-feature graph rather than inherit an
  unconditional exception.

## Bounded corrective work

1. **Completed:** add the exact Chhoto Cargo lock as a tracked, checksum-verified
   source input and run the targeted scan above. Preserve `--locked`. The next
   native build should capture its actual Cargo workspace and selected-feature
   graph rather than treating all locked packages as compiled dependencies.
2. In the next reproducible build, install a reviewed, version/checksum-pinned
   [cargo-auditable](https://github.com/rust-secure-code/cargo-auditable) in the
   builder and use `cargo auditable build` with the same locked release/features.
   Confirm the resulting `.dep-v0` survives the configured strip operation.
   [Trivy's documented Rust support](https://trivy.dev/docs/latest/coverage/language/rust/)
   specifically recognizes these binaries, as well as Cargo manifests. This is
   build-time provenance, not a new runtime service.
3. Retain the exact toolchain/base digest, selected dependency graph, compiler and
   musl/native-library provenance, binary hash and final image ID in a build
   receipt. Track native/toolchain review separately where the crate scanner does
   not cover it; do not pretend Alpine's entire builder package list is present
   in the final scratch image. Pin newly resolved build inputs as appropriate.
4. Re-run native regression tests and isolated application checks, then scan the
   candidate image and assert a nonempty actual Rust package inventory. Keep
   source-lock checks too. Distinguish “no runtime distro by design” from “unknown
   package inventory” in reporting without broadly waiving zero-package images.
5. Root/operator coordinates rollout. Chhoto requires its normal native SQLite
   backup/restore gate. **Rustpad holds live pads only in memory; restarting it
   destroys them.** Use the documented maintenance notice/copy instructions; do
   not restart it casually to close an inventory alert.

The initial investigation did not build or release either application. The later
implementation now uses the pinned cargo-auditable helper, pinned native build
packages, captured toolchain/native provenance and candidate-level actual binary
inventory checks. See the linked receipts for measured coverage and release
status; a candidate's scan is not evidence that the old live binary has changed.
The separate Penpot runtime inventory issue is outside this scratch-Rust finding.
