# Razzia deployment — 9 October 2026

Live at https://quiz.utilibre.org, Caddy → 10.10.1.43:3199. Native manager authentication, participant PIN join, two simultaneous independent rooms, correct/incorrect scores, JSON export/import, results view and deletion passed over public HTTPS. The native interface provides English/French/Japanese, not Spanish; the portal guide uses EN/ES voseo.

## Release and security

Upstream [3.1.0](https://github.com/Ralex91/Razzia/releases/tag/3.1.0), commit `277a33849827c0847ec85e99f2135888f72bd0c1`, root MIT licence. Local image `utilibre-razzia:3.1.0-p1`. Native application source is unchanged. `security-dependencies.patch` contains only exact transitive dependency overrides and their lockfile changes: socket.io-parser 4.2.7, engine.io 6.6.10, seroval 1.6.3, postcss 8.5.23, source-map-js 1.2.2 and legacy nanoid 3.3.18. Modern nanoid stays on its original major.

These address current advisory findings, including [Socket.IO parser memory exhaustion](https://github.com/advisories/GHSA-2m8v-j782-fhvr) and [Engine.IO protocol mismatch DoS](https://github.com/advisories/GHSA-2gc4-cqfq-p2gv). The final production dependency audit returned zero reported vulnerabilities on the verification date; that is not a guarantee against future or unreported issues. Node was updated from 24.14.0 to the current Node 24 LTS image, pinned by digest; runtime reports 24.21.0. No exploitation was attempted against production.

`deployment/razzia/build.py` asserts the source commit, checks/applies the removable patch and builds with the captured lock. The Dockerfile pins both stages. Public source offer: https://tools.utilibre.org/utilibre-source/razzia-utilibre.tar.gz.

## Access, privacy and limits

The native manager password is a shared operator credential, not a personal user account. A manager can read/edit/delete the shared quiz and finished-results library. Do not hand this credential to untrusted users or describe manager libraries as isolated. Participants need the six-digit room PIN and a nickname. Room control is restricted to its creating manager socket; another authenticated manager could not start or kick a participant from the test room. This does not make quiz content or participant results confidential from other trusted managers.

The browser stores a random client UUID for reconnection and manager-session continuity, the recent game PIN, language and application state. This is functional state, not a visitor analytics feed. Clear this site's data on a shared device after logging out. Manager authorizations and active rooms live in server memory; restart loses live games/sessions. A disconnected manager's room is cleaned after the native five-minute grace period, checked on a one-minute interval.

Quiz definitions, answers/settings and completed-game records are server-readable files. Results contain nicknames, answers, scores/ranks and timestamps, and do not expire automatically. Native result deletion is separate from quiz deletion. Downloaded quiz copies and existing backups remain after live deletion. No email, external avatar or analytics provider is configured. Native fonts/assets are local; the CSP blocks external images/media. Remote media URLs in imported quiz definitions therefore may not display. Public HTTPS traverses Cloudflare and Caddy; provider/edge retention is not determined by this application check.

The socket service is on an internal network, capped at 1 CPU/256 MB/96 processes. Gateway: 0.5 CPU/128 MB, read-only filesystem, no retained access log, bounded error log rotation (2 × 5 MB). Native socket stdout includes client identifiers/nicknames, so its Docker logging driver is `none`; ordinary gateway/system/security infrastructure metadata is separate. Gateway limits are 15 HTTP requests/second with burst 60 and 40 WebSocket connections per source IP. A classroom behind one NAT can hit that connection ceiling; this is not a measured 40-person guarantee. Two parallel rooms with one player each were tested, not a heavy capacity benchmark.

Native branding sets the Utilibre name and local font. The supported branding schema has no navigation-link field, so there is no injected portal navigation or tracking redirect. The portal catalog/guide supplies the return route. Security discovery redirects to the working central security.txt; noindex does not provide access control.

## Export and deletion

Managers: sign in at `/manager`, choose **Quizz**, and use **Export quizz as JSON** next to the selected definition. The downloaded JSON contains the subject, questions, answer options/solutions, media URLs and scoring/timing settings, excluding the internal quiz ID. It omits finished player results, manager credentials, active sessions and referenced media bytes. Use **Import quizz from JSON** in a compatible Razzia installation; this creates a new definition. Inspect the questions after import.

The native **Results** tab shows finished-game details and provides deletion, but this installed version has no results download/import button. The operator's private backup contains native result JSON; a requested copy must be limited to the authorized event. Do not promise a user-facing CSV export or result-import UI. Delete quiz definitions and result records separately with their native trash controls and confirmation. Participants have no individual account to delete; contact the operator privately with the event/time and nickname when needed.

## Recovery and verification

`backup.py` is included in `utilibre-community-backup.timer`, daily at 04:25 UTC plus up to 15 minutes jitter. It reads native independent JSON records, checks each read's stability/valid JSON and copies configuration/branding into a private archive without restarting live games. It is not an atomic transaction across concurrent changes to different files. Backups include the manager secret, stay private on this VM, and have no configured automatic deletion or offsite protection.

`razzia-20261009T013706Z` passed checksums and was restored into a fresh network-none container. Native manager authentication then reopened both fictional quiz definitions and both finished results. This tests persisted state, not restoration of active rooms. `check-restore.py BACKUP_DIRECTORY` reproduces that check with the private fixture identity record. Only the two known fictional quizzes and two known results were deleted through native controls afterward.

Checks: `check-native.mjs` creates fictional definitions and tests auth, export/import, room controls and separate scores; `check-browser.mjs` checks actual JSON download/results rendering and zero external HTTP hosts; `check-restore.py`/`check-restored.mjs` verify native recovery; `cleanup-fictional.mjs` verifies exact fixture ownership before deletion. Reports and private fixture identifiers are under `/opt/utilibre/reports/new-services-20261009/razzia-*`. No real user records were inspected or deleted.

For upgrades, take a backup, validate the new image with a disposable restored copy, publish its static assets and recreate only the socket service. That intentional restart disconnects active games, so schedule it between events. Restore the old image/static assets and compatible state snapshot if rollback requires it. Do not restore production state over live files without an explicit maintenance step.
