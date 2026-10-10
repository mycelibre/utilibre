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
   and `firewall.sh`. Runtime secrets and the database live under
   `/opt/utilibre/family-chess/`, outside this repository. Generate a fresh secret
   for a new installation; never replace the production secret during a rebuild.
5. Run `check-native.py` only against disposable copied state, using its documented
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

Use the consistent SQLite snapshot and matching private settings in the existing
root-restricted backup directory. Stop this service, preserve current files for
rollback, install the selected snapshot with uid10001 ownership, then start the
pinned image and check it before routing traffic. A recovery test uses a separate
copy and fictional games. Daily snapshots have no automatic expiry; no off-host
recovery is claimed. See `docs/family-chess-deployment-2026-10-09.md` for measured
checks, lifecycle limits and the public-edge status.
