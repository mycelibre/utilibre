# Family Chess native deployment

The checked source is `kelvinq/family-chess` revision
`f6e50932df60c531933dab4e07c6642cfee55e2d`. The application is Apache-2.0;
Python chess dependencies retain their GPL-3.0-or-later notices.

## Rebuild

1. Put a checkout of that revision at `/opt/utilibre/src/family-chess`.
2. Create `/opt/utilibre/family-chess-build-venv` with `python3 -m venv`, then
   install `polib==1.2.0` into that build-only environment. It compiles native
   Spanish gettext resources and is not included in the application runtime.
3. Run `deployment/family-chess/build.sh` from this repository. `prepare.py`
   extracts the exact Git revision into `/opt/utilibre/build-family-chess`, applies
   `source.patch`, compiles `spanish.json` to native gettext catalogs and copies
   these recipes. The Dockerfile uses a pinned base and hash-pinned dependencies.
4. Follow the existing private configuration and network setup in `compose.yaml`
   and `firewall.sh`. Runtime secrets live under `/opt/utilibre/family-chess/`;
   the database lives at `/opt/utilibre/temporary/family-chess/` on the
   backup-excluded disk, outside this repository. Generate a fresh secret
   for a new installation; never replace the production secret during a rebuild.
5. Run `check-native.py` only in an isolated container, using its documented
   environment. The production cleanup and backup commands have their own units.
   Never restore test data over a live database.
6. Publish the exact source with `python3 deployment/family-chess/publish-source.py`
   and update the existing source-index hash. `Caddyfile` belongs on the separate
   edge after native checks. `check-public.mjs` completed real HTTPS multiplayer
   verification with one disposable game, without hostname overrides.

The source patch changes native identifiers, gettext integration, operator notes
and responsive board sizing. Session permissions and game logic remain upstream.
`settings.py` uses Django's supported settings mechanism. Native HTTPS CSRF needs
same-origin referrers; do not copy a no-referrer header onto this application.
The native board uses click/tap movement, not dragging. The public verification
checks two players, a spectator, live updates and EN/ES mobile rendering, then
removes exactly the fictional game it created. It does not restore a database.

## Recovery

From 10 October 2026, snapshots retain `private/` configuration only. The guest
deployment has no saved accounts; seven-day games and sessions are deliberately
excluded, locally and from new Storage Box uploads. Existing live games and
historical snapshots are not deleted. Historical local copies have no automatic
expiry; separate VM snapshots remain outside this job's control.

After an actual storage loss, restore the matching private settings, create an
empty `/opt/utilibre/temporary/family-chess` owned by UID/GID 10001 **only after
verifying the excluded disk is mounted**. This is `/data` inside the container.
Run `python manage.py migrate --noinput`
using the pinned image and those settings before starting the service. Do not
restore old games/sessions, and never replace live state during a routine update.
`check-native.py` creates a fresh schema and fictional multiplayer fixture, checks
permissions, moves and cleanup, then removes its disposable directory. Its small
SQLite reopen check uses only that fictional fixture, not production records.
Configuration is included in encrypted Storage Box backups. See `docs/backups.md`
for current scope; older recovery evidence remains dated historical evidence.

The 11 October migration preserved live data byte-for-byte, including ownership
and modes. Public two-player/spectator tests and native SQLite integrity passed
before removal of the obsolete root-disk copy. `create_host_path: false` prevents
silent system-disk fallback. The application retains its 256 MiB RAM ceiling
without swap; native SQLite's 65,536-page limit at 4,096 bytes bounds the main
database at 256 MiB, **not** WAL files or a reserved filesystem quota. Existing
seven-day game expiry and minute-by-minute cleanup are unchanged.
