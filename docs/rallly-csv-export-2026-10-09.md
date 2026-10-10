# Rallly CSV export, 9 October 2026

The installed 4.15.4 image, pinned to digest
`8f29eccdc2fbb856001ea3c97d1c1d85556095274ad21a8de0c0125f29303938`,
passed a native organizer CSV download. Source review used installed revision
`4b61a00b1abcbe480d6b3992b5d98b01754e90c6`, not the newer checkout HEAD.

A fresh PostgreSQL database and the exact application image ran on an internal
Docker network with a loopback relay. The fixture used a native session and
seeded fictional non-guest organizer, poll and participant records. Production
OIDC, accounts and polls were not accessed. This check does not retest signup.

In the native browser interface, Manage → Export to CSV downloaded two
participants' names, the one supplied fictional email address, response times
in the selected America/Guatemala timezone, two option dates and Yes/No/If need
be votes. Each value matched the fixture. Participant tokens, poll description
and venue were absent. The CSV is a readable result table, not a complete poll
archive. The installed application has no corresponding native CSV importer.

An anonymous browser was redirected from management to login; the public invite
view had no management/export menu. This does not stop a visitor copying votes
that the public invite already displays. No outside browser request occurred.

All fixture containers, the network and loopback relay were removed. No
production state, service setting or retention changed. The reproducible private
fixture scripts and metadata are under
`/opt/utilibre/reports/rallly-export-9475e44910/`; `csv-check.mjs`, `result.json`
and `cleanup.json` distinguish the browser check and verified disposal.

The EN/ES data guide states these checked fields and limits. Previous source
review of deletion controls and the security upgrade remain separate evidence.
