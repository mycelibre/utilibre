# Grist sandbox review — 11 October 2026

## Decision and exact installed boundary

**Keep the current gVisor sandbox enabled. No production setting, privilege,
image, registration policy or user document was changed by this review.**
There is no verified drop-in, current-Go rebuild for this old fork. Replacing
its toolchain is substantially different from rebuilding an ordinary utility.

Installed Grist 1.7.21 image:
`utilibre-grist:libraries-security-20261011`,
`sha256:2775bf60ef3a2058d99edb5656e9e4e150662283fce9c88e6d7cd1295583ac80`.
`/usr/bin/runsc` is `release-20220309.0-11-g134df272d531`, built with Go 1.17.6,
27,420,936 bytes, SHA-256
`2aca288a1bd6b38f904defed9cbbd326d824323fe0b91cb12d808cde22d597d6`.
It is a stripped, statically linked Linux x86-64 ELF; conventional `go tool nm`
cannot read a symbol section, but its Go function table remains available.

Verified settings: `GRIST_SANDBOX_FLAVOR=gvisor`,
`GVISOR_FLAGS=-unprivileged -ignore-cgroups`; Deno bypass is unset.
The deployed launcher adds `-network none` and provides selected read-only
mounts while masking other paths. Compose retains UID 1000, dropped capabilities,
no-new-privileges, read-only root, an internal network, 8 GiB memory, two CPUs
and 128 container PIDs. The launcher defaults to eight sandbox processes.
These boundaries reduce exposure; they do not prove an old sandbox escape-safe.
Authenticated access does not make user formulas trusted.

## Why a simple Go-version bump is not an accepted fix

The [Grist 1.7.21 Dockerfile](https://github.com/gristlabs/grist-core/blob/v1.7.21/Dockerfile)
still takes `runsc` from `gristlabs/gvisor-unprivileged:buster`. Its comments
explain that the fork removes privilege-dependent layers to work in ordinary
unprivileged Docker. Substituting official gVisor may require additional
permissions; that is not accepted merely to reduce a scanner count.

The binary's [source commit](https://github.com/gristlabs/gvisor/commit/134df272d53171ab24d1fd3ea5555d079ff442be)
is dated 17 March 2022. The inspected branch tip
`c1b13844666cb278320b6de349bcf00cf4402ef5` differs only in
`packaging/Dockerfile` and `packaging/Makefile` according to the upstream
[comparison](https://github.com/gristlabs/gvisor/compare/134df272d53171ab24d1fd3ea5555d079ff442be...c1b13844666cb278320b6de349bcf00cf4402ef5).
The reviewed source archive hash is
`7e20190c6d05c8c15b32ec26ed2991289e5bf9dda65568069cb6198755bf4db8`.

- Its Bazel workspace pins Go 1.17.6 and patches that SDK.
- [`pkg/gohacks/gohacks_unsafe.go`](https://github.com/gristlabs/gvisor/blob/c1b13844666cb278320b6de349bcf00cf4402ef5/pkg/gohacks/gohacks_unsafe.go)
  and `pkg/sync/runtime_unsafe.go` explicitly select `go1.13 && !go1.20`.
  They bind Go runtime internals, scheduler functions and private map layouts.
- A read-only, network-disabled Go 1.26.9 check returned
  `compiled=[] ignored=[gohacks_unsafe.go]` for that package. This is direct
  evidence that changing the compiler alone omits essential implementation;
  removing the guard would not establish ABI compatibility.
- The newer [`paulfitz/grist-2024` branch](https://github.com/gristlabs/gvisor/commit/4f03d181471cb965f378db4fb5304cb5a9b2843c)
  is a February 2025 attempt to reapply the unprivileged patch, pins Go 1.23.2,
  and is not the sandbox selected by the released Grist Dockerfile. It is not
  a reviewed replacement here.

No expensive full fork build or production experiment was performed after this
specific incompatibility was identified. Required repair is a maintained,
current-toolchain port preserving these restrictions, followed by native formula,
import/export, process/filesystem/network isolation and restore tests. A build
that merely starts or prints a version would be insufficient.

## Five critical findings: narrower reachability evidence

The raw scanner reported five critical findings in this Go 1.17.6 binary.
They are not five demonstrated sandbox escapes. The checked-in read-only
`inspect-grist-runsc.go` uses Go's standard `debug/elf` and `debug/gosym` to
inspect this exact hash. It recovered **43,599 function entries** and found no
function names or literal package-path bytes for the four affected packages.
No suppression is written by this helper, and raw findings remain intact.

| Finding | Go advisory scope | Evidence and remaining qualification |
| --- | --- | --- |
| CVE-2022-23806 | [`crypto/elliptic` invalid field elements](https://vuln.go.dev/ID/GO-2021-0319.json), notably `CurveParams.IsOnCurve` | No package functions/path in the binary. Source imports it only in `pkg/crypto/crypto_stdlib.go`; no other Go source imports that wrapper or calls its ECDSA verification helper. Source import review plus ELF absence supports exclusion, but this is not a complete transitive Bazel link/call-graph proof. |
| CVE-2023-24538 | [`html/template` JavaScript-template escaping](https://vuln.go.dev/ID/GO-2023-1703.json) | No package functions/path in the binary; no Go source imports `html/template` in the inspected fork. Grist's JavaScript web server is a different component, not this Go executable. No complete inlining/call-graph proof is claimed. |
| CVE-2023-24540 | [`html/template` JavaScript whitespace handling](https://vuln.go.dev/ID/GO-2023-1752.json) | Same independently observed package absence as above; no finding in another image/package is covered. |
| CVE-2024-24790 | [`net/netip.Addr` address classification](https://vuln.go.dev/ID/GO-2024-2887.json) | No package functions/path/imports. More decisively, `net/netip` was [introduced in Go 1.18](https://go.dev/doc/go1.18#net/netip); the installed executable identifies Go 1.17.6. The broad stdlib version range does not establish that this later package exists here. |
| CVE-2025-68121 | [`crypto/tls` session resumption after CA configuration changes](https://vuln.go.dev/ID/GO-2026-4337.json) | No package functions/path. The fork's sole direct TLS import is its separate webhook application, not `runsc`; deployed document sandboxes also use network-none. No claim that network-none alone proves all TLS paths unreachable. |

This review is intentionally limited: function-table absence can miss compiler
inlining, transitive dependencies were not rebuilt into a complete dependency
graph, and the source/binary is not reproducibly re-linked here. Only the
`net/netip` version/scope mismatch has an independent standard-library
introduction-date proof. Any waiver for the other four should await the owner's
security review of this evidence, be exact-image/CVE-bound, and expire on change.
The **173 high findings** from this image's preceding raw scan are not closed
or waived by this table; final release counts belong in the scanner report.

## Supported alternative, not activated

Grist supports a native Deno + Pyodide sandbox, as documented in its
[README](https://github.com/gristlabs/grist-core/blob/v1.7.21/README.md) and
[`SandboxPyodide.ts`](https://github.com/gristlabs/grist-core/blob/v1.7.21/app/server/lib/SandboxPyodide.ts).
The installed image contains Pyodide 0.28.1 and Deno 2.6.3, with required packages
prepared at image build. Native code grants narrow initial read/write locations,
does not grant network permission, then revokes initialization permissions before
running formulas. Its Node-only bypass is expressly a weaker boundary and must
not be enabled.

This alternative changes the isolation model and Python/runtime behavior, so it
was not selected here under the instruction to preserve gVisor. A future
isolated evaluation would need current Deno/Pyodide dependency review, local
asset completeness, real formula/import/export compatibility and the upstream
sandbox permission tests. It is a supported research path, not an already
verified production fix or a reason to remove `runsc` now.

## Reproduce the read-only binary inspection

Copy only the public executable from the Grist container to a private review
directory, never account data or environment files. Run `inspect-grist-runsc.go`
with a supported Go toolchain and the copied executable as its sole argument.
The helper rejects any different hash. The investigation used pinned
`golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade`,
network disabled, read-only root, UID 1000, no capabilities, a temporary compiler
cache, 1.5 GiB RAM and two CPUs. No new runtime dependency was installed in Grist.

There is no rollout or rollback step for this report: production remains
unchanged. Preserve the sandbox while pursuing an actually compatible upstream
repair; do not use `unsandboxed`, `skip`, privileged Docker, broad added
capabilities, or Deno's bypass as scanner workarounds.
