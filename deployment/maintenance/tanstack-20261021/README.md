# Penpot admin-console TanStack repair

Deployed image: `utilibre-penpot-admin:tanstack-security-20261021`, immutable ID
`sha256:d07dc2a23ddf713e1ef11821393cd0ee7f0d8b5ec1daa7861ea018f7a600edcd`.
Only the admin console was replaced; all other Penpot container identities and
effective configuration were checked unchanged. No production migration ran.

This is a bounded backport of the MIT-licensed TanStack upstream commit
[`d521abd71c69f1ff010bb3def4d417cb5fa058cb`](https://github.com/TanStack/router/commit/d521abd71c69f1ff010bb3def4d417cb5fa058cb),
for [GHSA-qx66-fv34-fjm8 / CVE-2026-102989](https://github.com/TanStack/router/security/advisories/GHSA-qx66-fv34-fjm8).
The installed Penpot Nitrate source is `9a009dfcfbed40c8d0ca2120f97d58fda3886461`.
The compiled SSR bundle retains the earlier Seroval/js-yaml/OpenSSL repairs.

`backport.mjs` accepts only the exact before/after SHA-256, checks ten unique
sites, rejects mismatches and recognizes an already-correct bundle without
editing it. Package metadata is deliberately **not** falsified to a newer
upstream version. `build.mjs` changes only that compiled bundle and checks image
configuration parity. `check.mjs` runs the old and new native application with
a disposable PostgreSQL fixture in a network-isolated namespace. Synthetic GET
and POST requests reproduce attacker-controlled HTML on the predecessor and
are rejected with HTTP 401 after the fix. An ordinary configuration function,
wrong-method rejection, login redirect and native migration schema are checked
on both. No real account or malicious executable payload is used.

Run build, check, scan, release **prepare**, then separately authorized release
**apply**; the scripts reject unsupported or stale candidates. `release.mjs`
also checks idempotency and retains the previous image for scoped rollback.
Rollback only covers the image: it is not a database restore mechanism.

`review.mjs` generates exactly two expiring review proposals after comparing the
live bundle to the tested SHA-256. Apply them only through the existing
`triage.mjs record` interface after review. This does not suppress raw findings
or exempt other TanStack releases. Evidence stays in
`/var/lib/utilibre-maintenance/tanstack-20261021/`; the application behavior
test is an isolated unauthenticated fixture, not an operator-account audit.
