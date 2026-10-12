# Grist sandbox replacement gate — 11 October 2026

Released final image:
`utilibre-grist:1.7.21-language-security-20261011`,
`sha256:aff22494de8e208a15198b124a7772fd07e9a38e009e0043c664927ab788f4b0`.
The earlier Deno-only candidate `53f12a42…` is an intermediate build, not the
production pin. The final image includes the separately tested
[compatible library overlay](../language-final/grist/README.md).

The official latest Grist release remains 1.7.21. Its Dockerfile still imports
the 2022 unprivileged gVisor fork. The newer experimental `paulfitz/grist-2024`
fork pins Go 1.23.2, is not the released Grist sandbox, and is not a
current-toolchain drop-in repair. Porting private Go runtime structures would
be a substantial security fork, not a compiler-only maintenance patch.

This candidate instead uses **Grist's supported Deno/Pyodide sandbox**. It does
not use `unsandboxed`, `skip`, the Node bypass, extra container capabilities,
or a privileged container. Grist and its bundled Pyodide 0.28.1 remain unchanged.
The native Deno executable is upgraded from 2.6.3 to the official immutable
2.9.7 release. `build-grist.mjs` verifies both ZIP and executable SHA-256 values
and the exact predecessor image. The unused old `runsc` executable is removed
from this candidate; its vulnerability family is not suppressed in the scanner.

## Privacy and required deployment configuration

Deno's CLI can check upstream versions even when user code lacks network
permission. Grist constructs a restricted child environment, so setting a
parent variable alone is insufficient. The seven-line `grist-deno.sh` wrapper
uses the supported `GRIST_SANDBOX` command override to set
`DENO_NO_UPDATE_CHECK=1`, `DENO_NO_PROMPT=1`, and a disposable local cache before
executing Deno. No application source, protocol, or Python engine is forked.

The released Compose applies these values together with the final image:

```yaml
environment:
  GRIST_SANDBOX_FLAVOR: pyodide
  GRIST_PYODIDE_SKIP_DENO: '0'
  GRIST_SANDBOX: /usr/local/bin/grist-deno
tmpfs:
  - /tmp:rw,nosuid,nodev,size=128m,mode=1777
  - /grist/sandbox/pyodide/_build/cache:rw,nosuid,nodev,size=128m,uid=1000,gid=1000
```

The explicit values must override the previous env-file `gvisor` selection.
Preserve all other access, network, resource, data, and backup configuration.
Read/write permission for engine initialization is revoked before formulas run;
the document-specific import directory keeps read access as upstream requires.
This changes the isolation implementation, not the promised ability to run
arbitrary host code. It is not a claim that Deno, WASM, or Grist is escape-proof.

## Verification

Run `node deployment/maintenance/sandbox-final/check-grist.mjs [candidate]`.
The optional image must use the bounded `utilibre-grist:1.7.21-*` namespace so a
compatible dependency overlay can reuse exactly these gates.

The final candidate passed with network disabled, UID 1000, no capabilities,
no-new-privileges, 1 CPU, 2 GiB memory, and 128 PIDs:

- Native Grist Python RPC, numeric/Unicode/date formulas, local import reads.
- Host-file separation, sandbox-only writes, rejected subprocess/network/JS
  operations, and unchanged host engine source after sandbox writes.
- The upstream `os.system` and Emscripten host-write escape regressions.
  The latter is denied by Deno and can terminate that document's sandbox;
  continued operation after a fatal malicious probe is **not** claimed.
- Native private document creation, calculation, second-account denial,
  SQLite-format export/reimport/recalculation, CSV numeric import and deletion.
- Stopped synthetic filesystem backup and restoration into a fresh isolated
  instance; document calculations and second-account denial remain correct.

Private final receipt: `sandbox-final-20261011/native-KFXaGe/result.json` under the
existing maintenance evidence directory. Only fictional records were used.
The complete gate takes about a minute with the deliberately restricted CPU;
a sampled 743 MiB resident usage is not a capacity benchmark.

## Coverage and rollback

The final image's isolated scan found zero critical and 68 high raw findings;
these are package occurrences, not proven exploits. None is waived by this
sandbox change. The final fleet review remains authoritative for current counts.

Production receipt: `sandbox-final-20261011/release.json`; live task evidence
`live.json`, denied-user browser check under records reports, and
`qa-retired.json`. The consistent saved-work backup
`/opt/utilibre/records/backups/20261011T225952Z` passed checksums and SQLite
integrity without reading existing user rows. Two newly authorized synthetic
accounts passed public HTTPS create/formula/export/account separation/delete;
a third unapproved account was denied. All three temporary identities were
then disabled, their sessions/tokens/test MFA revoked. Real accounts unchanged.

The first attempt automatically restored the previous image because the live
test omitted Grist's required CSRF header on bodyless DELETE. Formula and export
had passed. The test now uses native `X-Requested-With: XMLHttpRequest`; only
its own fictional document was cleaned up before the successful retry. No user
database was restored. The release hash uses recursively sorted object keys so
Compose's environment ordering cannot create a false configuration-drift alarm.

The official Deno binary has no recoverable embedded Rust-crate inventory and no
published release SBOM was found. Forty published upstream Deno advisories were
reviewed against their patched versions; none requires a release newer than
2.9.7. This establishes the reviewed **Deno application version**, not a complete
compiled dependency vulnerability inventory. Pyodide's public advisory endpoint
returned no entries, which does not establish absence of vulnerabilities. Its
bundled Python/WASM components remain upstream-pinned and this coverage limit
must not disappear from maintenance reporting. Existing npm Deno loader files
retain Grist's original wrapper version; the pinned binary runtime and its
manifest provide the authoritative executed version.

Rollback: restore the predecessor image and `GRIST_SANDBOX_FLAVOR=gvisor`, remove
the Deno command/bypass overrides and its extra cache mount, then recreate only
Grist and confirm health plus the authenticated native formula journey. Do not
restore an old user database over newer writes merely to roll back an image.
The original gVisor image and backup remain available. The coordinating release
receipt, not this candidate README, establishes actual production deployment.

## Primary sources inspected

- [Grist 1.7.21 release](https://github.com/gristlabs/grist-core/releases/tag/v1.7.21)
- [Grist sandbox launcher](https://github.com/gristlabs/grist-core/blob/v1.7.21/app/server/lib/SandboxPyodide.ts)
- [Native Grist sandbox tests](https://github.com/gristlabs/grist-core/blob/v1.7.21/test/server/Sandbox.ts)
- [Grist's Pyodide advisory and Deno fix](https://github.com/gristlabs/grist-core/security/advisories/GHSA-7xvx-8pf2-pv5g)
- [Deno 2.9.7 official release](https://github.com/denoland/deno/releases/tag/v2.9.7)
- [Deno background update checker](https://github.com/denoland/deno/blob/v2.9.7/cli/tools/upgrade.rs)
- [Deno public advisories](https://github.com/denoland/deno/security/advisories)
- [Experimental unprivileged fork workspace](https://github.com/gristlabs/gvisor/blob/paulfitz/grist-2024/WORKSPACE)
