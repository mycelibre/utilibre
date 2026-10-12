# Kuma cryptography native replacement

12 October 2026. Replace the Python cryptography dependency, not Kuma, its Node
runtime, SQLite data, notification configuration, credentials or system OpenSSL.
The immutable parent `2dc3cf…` contains the earlier Python, Sudo, Click, LDAP and
native security repairs; `stage.mjs` requires that exact parent and compares
unrelated package versions, runtime bytes and configuration.

## Why this scope

The installed Debian `python3-cryptography 38.0.4-3+deb12u1` uses OpenSSL 3.0.22.
[CVE-2023-50782](https://security-tracker.debian.org/tracker/CVE-2023-50782)
needs the newer cryptography/OpenSSL mitigation, not a version label change or a
claim that encryption happens to be unused. The complete upstream
[cryptography 50.0.2](https://cryptography.io/en/latest/changelog/) Linux wheel
bundles OpenSSL 4.0.3. Its publisher signature is cryptographically verified using
PyPI's documented `pypi-attestations` verifier and expected `pyca/cryptography`
repository. The matching source distribution is verified too.

Exact wheel contents are placed in honest Debian package wrappers:

| Package | Local version | Purpose |
| --- | --- | --- |
| python3-cryptography | 50.0.2+utilibre1 | Complete upstream cryptographic implementation |
| python3-cffi-backend | 2.1.1+utilibre1 | Required native CPython 3.11 interface |
| python3-cffi | 2.1.1+utilibre1 | Complete matching upstream Python interface |
| python3-pycparser | 3.11+utilibre1 | CFFI's declared parser dependency |

CFFI and pycparser do not publish attestations for these artifacts; they are
downloaded through official HTTPS PyPI release metadata and pinned SHA-256,
not misrepresented as signature-verified. All source distributions and upstream
notices are retained. None of the Python, Rust or C code is patched. These local
wrappers are not Debian-issued packages. They target the current amd64 CPython
3.11 deployment; an interpreter transition requires a reviewed new build.

The OpenSSL in cryptography's wheel is isolated from system libssl/libcrypto;
the system libraries remain byte-identical. The vulnerable old Python native
extension and old distribution metadata must be absent, not merely shadowed by
a second installation. `payload.mjs` compares every new Python/native runtime
file with the pinned wheel payload. The old Debian build-time Python-package
mapping `/usr/share/python3/dist/python3-cryptography` is superseded by the
upstream distribution metadata; this scoped packaging change is explicit.

## Verification and honest limits

`native.py` runs with networking disabled against both baseline and candidate:
RSA PKCS1v1.5/OAEP roundtrips, PSS, OAuthlib RSA-SHA256 signing, PyJWT
RSA/PSS/EC/Ed25519 verification and algorithm rejection, Fernet/AES-GCM, and
Apprise's AES-CBC and WebPush key handling. Existing Apprise 1.10.0, OAuthlib
3.2.2 and PyJWT 2.15.1 are unchanged. The candidate additionally checks CFFI
declaration/loading and actual crypto/OpenSSL versions. No real notification,
secret, account, private key or remote service is used.

The established disposable Kuma gate creates a fictional administrator,
authenticates its native Socket.IO session and verifies the application using
temporary SQLite in a network-none container. This is functional compatibility,
not an independent proof about constant-time behavior or every possible
notification integration. The security repair relies on the actual supported
upstream implementation/backend, not a locally written crypto patch.

## Reproduction and release

Private work: `/var/lib/utilibre-maintenance/kuma-crypto-final-20261012`.

1. Run `acquire.mjs` to fetch the exact hash-pinned upstream wheels and sources.
2. Create a private build-tool venv; install `pypi-attestations==0.0.30` there.
   Run `verify-provenance.mjs`. Its dependency lock is retained privately; this
   verifier is never installed into Kuma or made a runtime dependency.
3. Run `package.mjs`, `stage.mjs`, `payload.mjs`, `application.mjs`.
4. Run `source-offer.mjs`; review, then `source-offer.mjs --publish`.
5. Run `release.mjs prepare`. It verifies the current live application and makes
   a private, consistent native SQLite recovery copy with integrity checking.
6. Operator changes only Kuma's image scalar in `community/compose.yaml` to the
   exact tested candidate, then runs `release.mjs apply`. Native readiness,
   actual crypto backend and the existing public status page must pass.
7. Run the normal fresh security scan. Old 38.0.4 findings/reviews must not be
   carried onto 50.0.2. This is an actual dependency upgrade, not a scanner waiver.

The prepared replacement requires no state/schema migration. Rollback restores
the previous image only, preserving SQLite and all configurations; automatic
rollback uses existing release machinery. Keep the old pinned image until the
new release is validated. Do not restore older user data as a routine rollback.

Work is bounded to small exact dependencies and synthetic checks. Preserve the
eight GiB host disk floor; builds/tests use at most two CPUs/two GiB and no
production application data. Source publication contains only source archives,
manifests and reproducible recipes, never receipts, backups or credentials.
