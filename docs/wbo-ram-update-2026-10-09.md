# WBO landing update with temporary state preserved, 9 October 2026

## Scope and preservation boundary

The staged landing title replaces an em dash with a colon; its English
introduction uses a comma. Spanish remains voseo. The existing bilingual board
notice and all privacy statements, drawing controls and service limits stay the
same. The deployed image is `utilibre-wbo:2.9.0-p3`, built from the existing pinned
WBO commit `f37875a6b427397e579e2a869caf073ae87ee264` and the existing recipe.

WBO normally loses its history when its Docker-managed 64 MiB tmpfs is destroyed.
This narrowly scoped update preserves the existing history once through its existing tmpfs and bounded process memory. It introduces no persistent board directory, automatic backup, longer
retention, alternate entrypoint or new application API. Ordinary restarts still
have the published temporary-storage limitation.

The VM has active file-backed swap. Both its pre-existing tmpfs and ordinary
process memory may be paged by the operating system. This procedure made no
regular-file board archive or persistent application mount, but it cannot certify
that no memory page ever reached swap. Core dumps were disabled for the helper.
Swap, backup and retention settings were not changed. This is a statement about
the actual storage boundary, not a guarantee of physical RAM confinement.

## Native source evidence and rehearsal

The native `server/runtime/boot.mjs` shutdown handler awaits
`socketModule.shutdown()` before exiting. `server/socket/index.mjs` saves loaded
boards during shutdown and loads saved boards lazily when requested. Native
idle save delay is 2 seconds, maximum save delay is 60 seconds; Engine.IO's
installed ping interval/timeout are 25/20 seconds. The HTTP root and its health
check do not open saved boards. The landing template is compiled only at startup.

`deployment/community/wbo/check-ram-reload.py` starts only a distinct disposable
container with no network, creates a fictional rectangle through the native
Socket.IO protocol, and verifies native retrieval. It holds an open directory
descriptor to that container's tmpfs across normal shutdown and removal. Linux
keeps the referenced RAM filesystem accessible until the descriptor closes.
The check copies an opaque tar archive through process memory into a normal
replacement container's fresh native tmpfs, compares aggregate file count,
byte count and SHA-256 including relative names/ownership/modes, reopens the
fictional drawing, adds another native rectangle and rehearses rollback to p2.
It deletes only its own disposable container. The reusable helper disables core
dumps and suppresses filesystem names in command errors. No board archive is written to a regular file or printed.

Reproduce with both retained p2 and p3 images installed:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 deployment/community/wbo/check-ram-reload.py
```

The check refuses to take over a pre-existing container of its reserved name.
This is an operator verification tool, not an unattended production updater.

## Production gate

A live update requires repeated zero-established-connection observations for at
least 75 seconds, exceeding both the native heartbeat and maximum save delay.
Socket sampling is an operational quiescence check, not a visitor counter or a
promise that nobody could attempt a request between samples. Stop the existing
gateway first and check again; if any connection remains, reopen it and abort.
Allow the idle save interval and require unchanged aggregate history. Keep an
open descriptor to the original tmpfs, then use normal SIGTERM shutdown and
require exit status zero. Snapshot the final native history into process memory; do not write an archive file.

Recreate only WBO using the ordinary compose/image configuration. While its
gateway is still stopped, restore the opaque archive to its fresh native tmpfs
and compare aggregates, original mounted history, resource ceilings, environment,
command and retention-related settings. The stopped gateway is the admission
gate: no board request reaches the new process before restoration. The native
root health check is allowed. Start the same gateway container only after those
checks pass. Keep the old tmpfs descriptor and in-memory archive until success;
on failure, recreate p2 and restore the same native bytes before reopening.
Never restore a whole database or inspect an existing board through its UI.

## Result

The isolated native save/reopen/new-mutation/rollback rehearsal passed. A
conservative comparison on the first live attempt triggered a successful
rollback before reopening ingress. The completed update compared environment
key/value sets rather than list ordering, together with unchanged resource,
storage, logging, command and restart settings.

The production gate passed 76 zero-established-connection samples, followed by
closed-ingress quiescence and native shutdown with exit status zero. The one
existing history file matched byte for byte before shutdown, after native final
save and after restoration. The gateway is the same container; no board was
opened or interpreted to verify preservation. The old p2 image remains available. After the public fictional-board check, the
remaining history aggregate again matched the preserved original exactly.
The normal container still has no persistent mount and uses its original 64 MiB
history tmpfs.

Public verification uses only a newly generated fictional board and erases only
its own two rectangles through the native tool. It checks English/Spanish
notices, bidirectional drawing, reconnect/replay, SVG export, desktop/mobile
landing and the two punctuation corrections, foreign-Origin denial, source
access and oversized-body denial. Native menus and underlying functionality are
unchanged. This is not a new capacity test or a durability guarantee.
Private operational evidence contains only aggregate history metadata and
container/configuration checks in
`/opt/utilibre/reports/wbo-ram-update-20261009/`; no real board names or contents
are included. Existing rollback images and durable backups remain untouched.
