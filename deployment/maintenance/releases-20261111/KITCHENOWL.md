# KitchenOwl 0.8.1: retained runtime and sign-in repair

This is a finite upgrade recipe, not an automatic approval of future versions.
`kitchenowl-build-inputs.json` records upstream source/image, the upstream's
Flutter submodule revision, compiler, engine, locks and exact reviewed output.
The frontend patch captures the requested route before asynchronous startup;
it leaves native authentication, permissions and token validation intact.

An unmodified frontend could discard the OIDC callback after a fast health
response. The predecessor also exhibited this timing problem. Both synthetic
native migration/recovery and browser sign-in pass after the correction,
including token refresh/rejection, household JSON import/export, reload,
deletion, a 390px viewport and production-equivalent security headers. The
issuer is a controlled local fixture, not the production identity provider.
No new real-phone or native-mobile-client claim is made.

The backend comes from the pinned official image. Psycopg's supported Python
implementation uses the already-repaired system libpq; the bundled binary
driver is removed so it cannot bypass the system repairs. The full image
comparison permits changes only in the application, virtual environment and
web directories. All other runtime files remain identical. Existing Debian
backport reviews and the unresolved ACL caller issue remain separate from the
new application release. No raw scanner finding is suppressed.

## Replay without activation

Retain the exact local images and private compiler/dependency cache identified
by the manifest. A Git checkout alone is not a complete runtime backup. The
compiler is Flutter 3.47.9 / Dart 3.13.7, matching the upstream submodule.
Controlled acquisition uses the official Flutter Git repository, Google
Flutter engine storage, pub.dev and the package-lock origins. It is separate
from replay; no moving version or network fallback is resolved by the adapter.
Missing or changed prerequisites fail before a build. Compiler image creation
also needs the exact recorded Debian packages; it is not repeated on release.
The three native package-configuration files produced during controlled
dependency acquisition are hash-bound too. Replay reuses those files and the
unchanged lock, with `--no-pub`: this SDK's offline `pub get` still attempted an
advisory lookup and was correctly stopped by the network namespace. Advisory
assessment remains the separate recorded scan; it is not disabled or hidden.

On a staging machine with those retained inputs and the recorded private
directory layout:

```sh
node deployment/maintenance/releases-20261111/prepare-kitchenowl.mjs --build new-replay
```

This prepares a clean Git archive, checks/applies the exact patch, checks its
reverse application and expected output hash, and runs the native Flutter
build with networking disabled, two CPUs and at most 6 GiB. Only disposable
source/home and dedicated compiler caches are mounted; no production data,
credentials or container-management socket enters the compiler. The 4 GiB
attempt failed and is retained as evidence. These are build-time resources,
not a new production allocation. Only the JavaScript web target is approved;
the alternate Dart-to-Wasm target failed its dry-run check.

`Dockerfile.kitchenowl-upstream`, `-driver` and `-web` describe the three
tested packaging stages. Verify local tag identities against the manifest
before each stage. Build with `--network none --pull=false`; the web stage's
context contains the resulting `build/web` directory renamed `web`. A replay
producing a different image needs a new artifact review. Byte-identical
builds are not claimed. Do not run the old 0.7.10 Dockerfile to rebuild this
release; it lacks this application and the retained runtime repair layers.

The native fixtures are `check-kitchenowl-upgrade.py` and
`check-kitchenowl-browser.py`/`.mjs`. They refuse to overwrite their previous
private evidence. Replay them in an isolated staging environment with the
recorded inputs, not by deleting earlier reports. The browser fixture needs
its existing local Playwright, TLS and Python dependencies. Runtime inspection
reuses the existing streamed image inventory helper.

## Approval, source and rollback

`held-inputs.json` binds the candidate to its tests, source offer, frozen
advisory database and complete runtime comparison. The release gate requires
advisory data less than 48 hours old. A historical successful replay is not
current security clearance. Source preparation is separate:

```sh
node deployment/maintenance/releases-20261111/prepare-kitchenowl.mjs --source source-offer
```

After the exact candidate is approved, the existing scoped release adapter
backs up saved account work and changes only KitchenOwl's image. The source
publisher separately publishes only the reviewed archive. Neither command is
part of the build or a scheduled update:

```sh
node deployment/maintenance/release-refresh-20261106/release.mjs kitchenowl --apply --held-nov11
python3 deployment/maintenance/security-20261109/publish-application-sources.py kitchenowl --held-nov11
```

Retain the prior image, Compose snapshot, native SQLite snapshot and saved
account files. An image downgrade does not reverse database migrations. A
database restore requires a separate decision because it can discard later
writes. Synthetic old-image snapshot recovery passed; a whole-VM restore is
not claimed. No registration, retention, quota, port, mail or telemetry
configuration change is part of this upgrade.
