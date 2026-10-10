# SimpleLogin security maintenance, 9 October 2026

Public activation remains blocked. The p7 recipe retains the p5 transport and p6 compatible-library repairs, then updates the separately pinned runtime cryptography, token, HTTP and CORS libraries. Native crypto/authentication regression checks pass. Flask, Jinja and Werkzeug remain legacy publication blockers; a reduced advisory inventory is not a security certification.

The immutable upstream base is v4.82.4 (`995904d5bc08ff5f951ad794b9372cbeb04d5fb6`). The layered Dockerfile installs Gunicorn 26.2.0 and aiosmtpd 1.4.6 using the wheel hashes in `transport-requirements.txt`, then rebuilds native package metadata with the matching Gunicorn constraint. It additionally applies the exact wheel hashes in `compatible-leaves.txt`; these satisfy the existing application dependency constraints without editing them. The original upstream `uv.lock` describes the immutable base, not these explicit layers. The recipe pins its metadata build backend and runs `uv pip check`; no application/database model or migration was changed. The existing STARTTLS and logging corrections remain.

## Reproduction

From the repository root:

```sh
docker build --pull=false -t utilibre-simplelogin:4.82.4-p7 deployment/simplelogin
python3 deployment/simplelogin/security/check-isolated.py utilibre-simplelogin:4.82.4-p7 /opt/utilibre/reports/simplelogin-security-rerun
python3 deployment/simplelogin/security/deduplicate-audit.py /path/to/pip-audit.json
```

Choose a new private report directory. The checker refuses an existing directory, uses bounded tmpfs PostgreSQL instances with `--network none`, and shares only their isolated loopback with the native processes. No production volumes, secrets or host ports are mounted. SMTP checks are EHLO and NOOP only. The configured send-mail suppression is additional protection; network isolation remains mandatory. The generated fixture secret and dump stay private. Its `finally` cleanup removes only its own randomly named fixture containers.

Checks cover native password login with CSRF, sudo confirmation with CSRF, the native CSV import function for a model-fixtured permitted domain, CSV export, native Gunicorn login HTTP, native SMTP EHLO/NOOP, database migration, fictional dump/restore, previous-image schema compatibility, native alias deletion/reservation and exact model-account cleanup. Import upload/job scheduling, external forward/reply, mailed ZIP export, account-deletion confirmation delivery, OIDC and FIDO are not established by this harness. Its temporary account/domain setup is test data, not an onboarding bypass for the installed service.

PostgreSQL readiness waits for TCP rather than the socket-only temporary initialization server. Early private harness runs identified and corrected a missing disposable upload directory and that readiness race; they were not application/security regressions.

## Why a complete framework update was not deployed

The latest release is still v4.82.4. The inspected master commit `070155c702a2bc6b0fdff46594e9cc931f61aa37` also pins Flask 1.1, Werkzeug 1.0, SQLAlchemy 1.3 and the other legacy framework dependencies. A newer source checkout therefore does not supply a supported fixed dependency set.

The 9 October follow-up checked the current release API, master, open upstream pull requests and relevant branches. Upstream's [security policy](https://github.com/simple-login/app/security/policy) supports only the latest major/minor and does not backport security fixes. `new-self-host-version` is a July 2023 branch still selecting Flask 1.1, SQLAlchemy 1.3 and cryptography 37; `refactor/docker-security` is from February 2021. The unmerged Flask 2.2.5 and Werkzeug 2.2.3 dependency branches are from 2023 and are below current advisory fixes. They are not a maintained, fixed alternative. None of the prior failed broad candidates was rebuilt during this follow-up.

`modern-candidate.Dockerfile` and its exact requirements preserve the bounded compatibility experiment. They are investigation inputs, **not a deployable image**. Build context is this directory; the local p4 image is the retained baseline. The first candidate failed importing old SQLAlchemy-Utils with SQLAlchemy 2.1. Updating the helper exposed its incompatibility with the 2.1 API; selecting SQLAlchemy 2.0.54 then failed the application's legacy model annotations. Source inspection also found removed APIs in the native WTForms email field import, Flask-Admin constructor and optional Redis-session cookie handling. Startup never completed for these candidates, so no successful auth or mail regression is claimed for them. No application-wide framework migration, bypass or monkey patch was deployed.

The audit alias grouper joins transitive advisory identifiers; its result is a package inventory, **not an exploitability count**. Windows-specific path advisories do not describe this Linux host. Debug-server advisories do not describe the configured nondebug Gunicorn process. Development tools in the upstream image and disabled integrations still appear in inventory. Flask session-cache findings depend on session access/cache conditions; dynamic gateway responses already use private/no-store. Multipart parsing and protocol-parser issues still merit attention even with request/resource ceilings. None of these distinctions is a blanket reason to ignore the remaining findings.

## Completed compatible p6 repairs

| Library | Previous version | Pinned replacement |
| --- | --- | --- |
| Flask-HTTPAuth | 4.1.0 | 4.8.1 |
| Mako | 1.2.4 | 1.3.12 |
| WebOb | 1.8.7 | 1.8.11 |
| cbor2 | 5.8.0 | 5.9.0 |
| certifi | 2019.11.28 | 2026.7.22 |
| filelock | 3.15.4 | 3.20.3 |
| rsa | 4.6 | 4.9.1 |
| sqlparse | 0.4.4 | 0.6.0 |

Official PyPI version metadata, wheel SHA-256 digests and the refreshed audit are recorded privately under `/opt/utilibre/reports/simplelogin-security-20261009/followup/`. The bounded `compatible-leaves.Dockerfile` first tested the layer over the retained p5 image. The production recipe then rebuilt it from the original immutable upstream image and independently passed the same isolated native regression. Neither step resolved dependencies afresh or bypassed `uv pip check`.

The package inventory decreased from **264 advisory rows / 148 deduplicated groups / 34 affected packages** on p5 to **230 rows / 129 groups / 26 affected packages** on p6. All eight selected packages have no remaining matches in that audit; this is not an audit of the OS, proof of no undiscovered bugs or a full framework fix. The unresolved Flask/Jinja/Werkzeug, cryptographic and HTTP dependency constraints remain the public gate. Disabled integrations and developer-tool inventory are still distinguished from verified reachable application paths.

The native pre-rollout backup at `2026-10-09T12-28-09Z` passed a separate networkless database restore and private-file extraction. Only this stack's web, SMTP and jobs containers were recreated. Database and gateway container IDs, loopback bindings, firewall, schema, state and backup retention were preserved. Live login is HTTP 200; EHLO and NOOP return 250; no SMTP DATA or outside message was sent. The live no-cache dependency check passes. Evidence: `followup/p6-native/result.json`, `followup/live-p6.json` and `followup/leaf-audit-summary.json`. The earlier p5 image and all backups remain available. A rollback selects p5 and recreates only the same three app containers with `--no-deps`; no schema downgrade is required. Do not restore a whole database over newer state for this dependency-only rollback.

## Primary evidence

- [SimpleLogin release](https://github.com/simple-login/app/releases/tag/v4.82.4)
- [Inspected master dependencies](https://github.com/simple-login/app/blob/070155c702a2bc6b0fdff46594e9cc931f61aa37/pyproject.toml)
- [Gunicorn 26.2.0](https://github.com/benoitc/gunicorn/releases/tag/26.2.0)
- [aiosmtpd SMTP-smuggling advisory](https://github.com/aio-libs/aiosmtpd/security/advisories/GHSA-pr2m-px7j-xg65)
- [aiosmtpd STARTTLS advisory](https://github.com/aio-libs/aiosmtpd/security/advisories/GHSA-wgjv-9j3q-jhg8)
- [Werkzeug multipart limits advisory](https://github.com/pallets/werkzeug/security/advisories/GHSA-xg9f-g7g7-2323)
- [Flask session-cache advisory](https://github.com/pallets/flask/security/advisories/GHSA-68rp-wp8r-4726)

The inbound SimpleLogin handler does not currently offer STARTTLS; the STARTTLS advisory's exact attack path is not claimed active here. Updating the SMTP dependency also addresses the independent inbound smuggling fix. Native outbound verified STARTTLS uses Python's separate SMTP client and remains unchanged.

## Runtime security repair, 9 October, p7

`runtime-requirements.txt` pins all 33 changed packages to reviewed PyPI artifact
hashes for the installed amd64/Python 3.12 image. Nine direct constraints are
updated in `pyproject.toml`; `runtime-dependencies.patch` records the exact change
and `apply-runtime-pins.py` performs it during the layered build. The app's Python
source, models, migrations and feature settings are unchanged. `uv pip check`
passes. PGPy 0.6.0 is required by the modern cryptography stack; its source archive
and build backend are pinned. The earlier PGPy 0.5.4 candidate failed a native
import and was never deployed.

The networkless fictional checks now include native signed-token creation and
tamper rejection; native PGPy and Rust encryption with independent decryption;
PGP signature verification and tamper rejection; OAuth CORS preflight, invalid
bearer denial and absence of cross-origin cookie permission; and synchronous/async
HTTP over the isolated loopback. Existing CSRF login/sudo, CSV, SMTP EHLO/NOOP,
migration, dump/restore, rollback-schema and scoped deletion checks are retained.
No external mail, real account, provider call or whole OIDC/FIDO workflow is
implied. PGPy's upstream deprecation/key-validation warnings remain visible in
private evidence; these tests do not certify every key algorithm or trust policy.

The p7 inventory reports 55 advisory rows, grouped into 30 distinct advisory
groups across eight packages, compared with p6's 230 rows, 129 groups and 26
packages. Remaining packages are Flask, Jinja2, Werkzeug, Black, IPython, pytest,
setuptools and virtualenv. Five are development/build/interactive tools; the
counts do not establish production exploitability. The framework needs a
compatible maintained update and remains a public-deployment blocker.

Evidence: `/opt/utilibre/reports/simplelogin-runtime-20261009/`, including
`p7-audit.json`, `p7-audit-summary.json`, hash-pinned artifact metadata, the final
native result and deployment/rollback receipt. No retention or provider change.
