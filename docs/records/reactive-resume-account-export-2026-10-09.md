# Reactive Resume native account ZIP check, 9 October 2026

The installed `utilibre-resume:6.0.0-p1` image passed a native account ZIP download
and one extracted resume JSON import into an independent fictional account. This
closes that bounded export check. It is not a complete account migration or a
new production restore test.

## Isolation and exact artifacts

The application image was
`sha256:fbcc5040865205f406cc488c140b240b421b6825917a5974a4d81c5aa6231e4a`.
Its native source pin remains `bc71f636c02a80ac6d731e17d2ee13501275295c`, with
the existing visitor-statistics correction. The checker used the same pinned
PostgreSQL image as production, a blank bounded RAM database, RAM application
storage and a new internal Docker network. No production volumes or credentials
were copied. A fixed-target temporary loopback TCP relay exposed the test app
only to the VM. No SMTP, AI provider or production identity service was configured.
Application and database limits were one CPU each, 768/256 MiB respectively;
their logs and processes were bounded.

The first harness attempt could not reach the app because Docker did not publish
the internal-network port. The app itself was healthy. The corrected harness
uses the same loopback relay pattern as the earlier Penpot check; it did not
loosen production networking or make the isolated network external.

## Performed native workflow

1. Created two local fictional accounts in the blank instance. Account A created
   one resume with a fictional name, headline and `.invalid` email address.
   Its source sharing setting was public so the import test could check whether
   that permission migrated.
2. In A's actual browser **Settings → Account → Your data → Export everything**,
   selected **Export**. The ZIP passed CRC checks and contained `account.json`,
   an empty `applications.json`, and the individual resume JSON. The account
   object's exact public-field allowlist passed; the generated test password
   was absent. Resume content, design and source sharing metadata were present.
3. In B's native **Choose a file** import, the complete ZIP showed the application’s
   instruction to extract a file from `resumes/` or `letters/`. Importing the
   extracted resume JSON then opened a new editable document. Checked content
   and all design metadata matched; the new document started private. A could
   not retrieve B's imported document.
4. Saved a changed fictional name through the native resume API and reloaded the
   actual browser editor. The changed name appeared. This proves persistence and
   reopening of the imported document, not every editor control or field type.
5. Deleted both accounts through the native account endpoint. Their former
   sessions could no longer export data, and the isolated user and resume
   tables were empty. No real account or document was accessed.

The browser made no outside-origin requests. The native ZIP was 1,977 bytes,
SHA-256 `0524b25b85a370339929fbb360d66185ba1728470a87137d34897e404e379b58`.
The canonical check ran from 14:36:31 to 14:36:48 UTC. Both temporary containers,
the network and the relay were removed; the listener and named resources were
confirmed absent afterward. Private fictional archive/screenshots/result are in
`/opt/utilibre/reports/resume-account-export-e01769fb2c/`.

## Scope and reproduction

Letters, nonempty job applications, trashed resumes, image bytes, historical
versions and complete account migration were not covered by this fixture.
The source-reviewed ZIP scope still documents those supported records separately
from checked behavior. Images remain URL references; downloaded archives need
protection. A document import does not restore accounts, public-sharing settings
or application links. Existing backups and their retention were unchanged.

Run `node deployment/expanded/check-resume-account-export.mjs` from the repository
with the cached pinned images, Docker, `socat`, Python and the existing Playwright
Chromium. The helper checks the existing 5 GiB recovery floor and will not pull
images. Port3430 must be free; `UTILIBRE_RESUME_EXPORT_PORT` can select another
free loopback port. Coordinate container/network changes with other browser
checks. Its `finally` block removes only its random, named fixtures and relay.
Evidence remains private; no session file, password or user content belongs in
the source archive.
