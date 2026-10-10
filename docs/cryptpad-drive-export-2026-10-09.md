# CryptPad personal and team exports, 9 October 2026

The installed 2026.9.0 source at
`c4a257e46919ba2e4e710c26f7e5dc067686e2b5` passed the native browser checks in
`deployment/pack/check-cryptpad-export.mjs`. The existing source and configuration
were mounted read-only into an isolated instance with fresh, bounded RAM storage,
an internal Docker network and loopback-only TLS. No production drive, account,
document, keys, backup or service setting was accessed or changed.

Two disposable native accounts were created. Personal Markdown and Rich Text
documents were saved and reopened. A tiny text file was uploaded with the native
owned/store options and confirmed in the drive after reload. The second account
accepted a native team invitation; the owner created a separate team document.

The native Settings → CryptDrive → Backup JSON contained no tested document
bodies. Download my CryptDrive produced these content files:

- `Drive/Fictional personal Markdown.md`
- `Drive/Fictional personal rich text.html`
- `Drive/fictional-upload.txt`

The HTML reopened in the browser. The Markdown file imported through the Code
editor's native File → Import into a new document in the second account; its
contents survived reload. The uploaded text matched the original fixture.

The personal ZIP omitted the team document. Teams → selected team →
Administration → Download, followed by its native confirmation, produced a
separate ZIP containing that document. This was an owner-role export; no promise
is made that every team role can export through Administration.

All named checks passed with no outside browser request. The fixture
containers, network, relay and RAM directory were removed. Metadata and content
hashes, without account credentials or access keys, are retained in
`/opt/utilibre/reports/cryptpad-export-20261009-cX39ON/result.json`.
Earlier attempts exposed checker startup/selector issues: the local TLS snippet,
bridge-related browser reload, upload completion and the separate team-download
confirmation. These were corrected in the checker; the installed app was not
patched for this test.

This does not establish complete personal/team-drive or account migration,
embedded-image fidelity, history/permission migration, every editor format or
remote-edge behaviour. The earlier owned-document/account deletion, office
export and collaborative server-restore checks remain separate evidence.
Backup retention is unchanged. Public EN/ES instructions state these limits.
