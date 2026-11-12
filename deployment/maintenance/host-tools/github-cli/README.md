# GitHub CLI dependency maintenance

Exact upstream 2.103.3 source, MIT, commit
`63837fb778d6a39f02be0ce76ff89f2bc8d74bdc`. `inputs.json` identifies retained
source, official Go 1.27.4 SDK, old native package, lockfiles and installed output.
Only `go.mod`/`go.sum` differ from upstream source. Native module resolution
selected x/net 0.62.0 and x/crypto 0.59.0 plus their recorded transitive updates.
Replay uses these locks; it does not resolve newer versions.

`build.sh prepare /var/lib/utilibre-maintenance/NEW-STAGE` is the controlled
download phase. `build.sh build` uses the same stage with networking disabled,
2 CPUs, 4 GiB RAM and no production mounts, credentials or Docker socket.
`package.py NEW-STAGE` wraps the exact accepted binary in the existing native
DEB. It rejects different build bytes; package timestamps can still differ, so
a resulting package needs its own review/hash. Byte-reproducible builds are not
claimed. Do not overwrite the retained preparation or release evidence.

Four ordinary upstream test packages passed: API transport, API command,
completion and telemetry. The first API-cache test failed because the isolated
profile had no writable cache directory; the explicit temporary cache fixed the
fixture, and all four packages then passed. Private logs retain both outcomes.
The same 12 November advisory snapshot found **162 embedded packages and no
findings** in the candidate. A later advisory snapshot may change that result.

Explicit `node release.mjs apply` checks predecessor/candidate hashes, tests,
fresh scan, native APT simulation (only `gh`), clean dpkg state and disabled
telemetry. It installs one native package without restarting services. Repeating
the command verifies the active artifact and makes no changes. Failure restores
the retained official DEB; a manual rollback can install that same hash-verified
DEB with `dpkg -i`, then repeat version/telemetry/dpkg checks.

Upstream usage telemetry defaults to enabled. Native configuration is now
disabled, and maintenance units/child processes explicitly set
`GH_TELEMETRY=disabled`. Tests cover that upstream environment override.
`gh config get telemetry` prints the stored/default setting, not the effective
environment override in an empty profile. No telemetry source fork was needed.
No assertion is made about transmissions before this correction.

Private evidence: `/var/lib/utilibre-maintenance/host-tools-20261112/gh-followup/`.
`source-scope.json`, `candidate-scan.json`, `test-retry.log`, `advisories.json`
and `release.json` preserve the checks. A read-only GitHub advisory request also
worked with the installed CLI. No external messages or artifacts were published.

The final host-package scan also reports CVE-2026-48501 because Debian's own
older package has no recorded fix. Upstream fixed it in 2.93.0; our exact
2.103.3 source application is unchanged. `review-package.mjs` checks the
installed binary/package, retained source-scope proof and upstream advisory,
then prepares one seven-day review. Recording it through the existing triage
command is a separate operator action. Raw findings remain; this does not
establish whether any historical credentials were exposed.
