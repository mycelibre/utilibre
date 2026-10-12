# Compatible dependency closure — 12 October 2026

This is a bounded security release, not a claim that the fleet has no remaining
vulnerabilities. Existing access, privacy, retention, quotas and user data stay
unchanged. No new public service, account registration or VM reboot is involved.
The private `closure-release-20261012.json` records old/new immutable image IDs,
all affected roles, unchanged resolved-configuration hashes and rollout gates.

## Changes and meaningful checks

| Application | Repair | Verification and limit |
| --- | --- | --- |
| Wishlist 0.67.1 | deepmerge-ts 8.0.2, Nodemailer 10.1.0 | Fresh account/list/item, persistence and anonymous denial; no external browser requests. MIME/Unicode/attachment contract, not real email delivery. |
| Spliit 1.29.0 | deepmerge-ts 8.0.2 | Group/expense creation, reload, JSON/CSV export and deletion; no external browser requests. |
| Rallly 4.15.4 | deepmerge-ts 8.0.2 | Fresh migrations, fictional invitation rendering and parser contracts; not a new live organizer-account test. |
| Uptime Kuma 2.5.6 | Nodemailer 10.1.0 | Fresh SQLite setup and authenticated Socket.IO session; MIME contract, not an outbound email. Existing monitoring retained. |
| Grist 1.7.21 | basic-ftp 6.2.3, image-size 2.0.4, ip-address 10.7.4, setuptools 84.0.0 | Native Deno/Pyodide isolation, two-account denial, formulas, SQLite/CSV export/import, deletion and synthetic restore. Exact image-size caller tested with PNG/malformed input. FTP client/parser contract, not an Internet FTP transfer. |
| RSSHub existing a7d4000 application | basic-ftp 6.2.3 | Isolated startup/health and FTP API contract; no live external feed connector in this gate. |
| SimpleLogin 4.82.4, restricted deployment | Signed Debian Flask/Werkzeug backports; setuptools 80.10.2; unused installer/cache removal | Native auth/CSRF/sudo/OAuth/CSV/PGP, SMTP EHLO/NOOP and synthetic dump/restore. Direct session, multipart, debugger-host and cookie regressions. **Legacy-framework/public-activation restriction remains.** |
| FerretDB 2.7.0 | MCP SDK 1.4.1, Go 1.26.9 | Four small handler adaptations; in-memory MCP contracts and six portable upstream packages. Gathio create/edit/token denial, image/ICS import/export and stopped PostgreSQL-copy restore. Production MCP remains disabled. |
| Anubis 1.27.0 | Go 1.26.9; go-git 5.19.2, go-billy 5.9.0, go-archive 0.3.0 | Runtime, developer compile, archive/path traversal tests; independent Chromium proof-of-work sessions, allow/deny and reload. Policies unchanged. |
| Authentik 2026.8.3 | OpenSSL 3.5.7-1~deb13u3, vendor `ak-fips` metadata | All 4,911 upstream tests; unchanged FIPS 3.1.2 module/config hashes, active providers, unchanged `/ak-root`, retained package holds. Fresh password/TOTP replay, RSA/ECDSA OAuth code exchange, JWKS and invalid audience/signature/code rejection. Not a new external IdP/browser MFA traversal. |
| Host OpenSSH | Debian 1:10.0p1-7+deb13u4+utilibre1 | Exact upstream client lifetime backport, Debian build/unit tests; repeated 16 KiB rekeys/512 KiB byte equality against old and new sshd, wrong host-key refusal. No exploit reproduction. Three coupled packages installed; existing SSH keys/config unchanged. |

Wallabag's existing OTPHP 10 backport was also reverified: two exact payload
hashes and 14 networkless native regressions. No new Wallabag image was needed.

The JS overlay checks every file/mode in the relevant application trees and
allows only the named dependency directories plus Grist's two-line attachment
metadata adapter. Python application/interpreter hashes are compared. This does
not make unchanged compiled/optional copies invisible: the fresh fleet scan
still inventories them. Old dependency versions are not relabelled as new ones.

## Sources and reproducibility

The additive `security-closure-20261012-source.tar.gz` contains complete patched
Anubis/FerretDB source, exact locks, original dependency archives/notices,
signed Debian source archives, patches and recipes. Use it with the existing
application source offers and `utilibre-integration.tar.gz` for shared helpers.
`publish-source.mjs` verifies all ten exact live images before publishing and
does not include production settings, logs, credentials or user records.

- JS pins, registry integrity and exact package paths: `../js-closure/specs.mjs`.
  `build.mjs`, `check-libraries.mjs` and the existing native checkers use isolated
  disposable databases/files. Native image recipes disable build-time networking.
- Python provenance: `../python-closure/sources.json`, `patches.json` and retained
  runtime patches. Archive signatures prove provenance, **not** current support
  for the legacy framework. Run `fetch.py`, `prepare.py`, then the two Dockerfiles
  with only the selected wheel/patch files and `apply-simplelogin.py` as context.
- Go: `../go-closure/build.py`, `build-*.sh`, exact locks in
  `../ferretdb-libraries/` and `../go-leaf-final/locks/anubis/`. The compiler is
  pinned `golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade`.
  The source-only `.git` marker is for upstream test root discovery, not history.
- Crypto: `build-fips.sh` builds signed Debian u3 with the same metadata as
  [Authentik's pinned recipe](https://github.com/goauthentik/fips/blob/2bfb6e9d30850808a679a022597332172a22f4ea/debian-fips/build/openssl.sh).
  `Dockerfile.fips` installs only four library/tool packages: **not** the newly
  built FIPS-provider package. The original provider/config stay byte-identical.
  [The DTLS fix is outside the FIPS module boundary](https://security-tracker.debian.org/tracker/CVE-2026-84782).
- SSH: `openssh-client-lifetime.patch` adapts
  [upstream e8bdfb15](https://github.com/openssh/openssh-portable/commit/e8bdfb151a356d0171fea4194dd205fbb252be23),
  retaining Debian's GSSAPI declarations. Apply to the signed stable source,
  then `build-ssh.sh`, `check-ssh.mjs`, `release-ssh.mjs`. Do not install sid's
  coupled glibc/server packages to fix this client-only defect.

All builders use at most two CPUs/two GiB, outside the request path, with an
8 GiB free-space floor. Authentik's test harness waited on a child before draining
its stdout. With this host's 8 KiB pipes, `82-test_tfo_cli.t` blocked in pipe_write.
Only those two disposable child stdout pipes were enlarged to 1 MiB; all eight
TFO assertions and the complete suite subsequently passed. No test was skipped,
no runtime setting changed, and no test-harness edit entered the shipped package.
For reproduction on similarly constrained pipe buffers, drain the test child's
stdout before waitpid, or enlarge that fixture pipe; do not disable TLS tests.

## Review and release

`release.mjs prepare <keys>` / `apply <keys>` requires fresh native evidence,
exact live predecessors, unchanged image configuration, unchanged resolved
Compose settings, known namespace dependencies, retained rollback image and
native healthy/non-restarting roles. A failed rollout uses the existing verified
rollback helper. It never copies or restores a production database.

`review.mjs` prepares exact, seven-day payload decisions. `--apply` explicitly
merges them into the private ledger and rebuilds the queue. It checks real
running payloads; SimpleLogin's overlapping patches are reversed in order on
disposable package copies, never the installed files. Raw scanner evidence is
unchanged. The CLI circular-import deadlock in `triage.mjs` is repaired and has
an isolated regression test.

New images reopen earlier reviews by design. Re-run component/architecture
checks against the new image, rather than copying all prior decisions. Remaining
vendor-unfixed findings, compiled Deno/WASM limits, separate Proxmox/edge scope
and the real GitHub schedule gap stay visible in `docs/work-queue.md`.

## Recovery

Retain the private release receipt and old image IDs. For one affected Compose
project, restore only that group's old image scalar and recreate only its listed
services using the same Compose files, working directory and environment source.
Verify native health and exact image identity. Do not roll back database files,
retention, firewall policy or credentials with an image. Restore all three
SimpleLogin roles together and both Authentik roles together. Old images restore
old defects and are emergency recovery, not preferred operation.

For host SSH, hash-check the three original `.deb` files listed in
`ssh-closure-20261012/release.json`, install them together with `--force-confold`,
then run `sshd -t`, `systemctl is-active ssh` and `dpkg --audit`. Do not restore
old host keys. The source addendum is additive; keep earlier source archives.

The root disk expansion is independent: 170 GiB virtual disk, approximately
168 GiB ext4 usable. It cannot safely be undone by restoring the old partition
table after filesystem growth. The separate 15 GiB temporary-content disk and
its backup exclusion/allocation were not changed. See `docs/resource-usage.md`.
