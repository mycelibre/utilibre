# Final Next.js patch review — 12 October 2026

This is a bounded follow-up, not an application migration or blanket exception.
Private receipts are in `/var/lib/utilibre-maintenance/next-leaves-final-20261012`.

## Bookplate

Application remains Bookplate 1.1.0 at upstream commit
`47e53a7aec56aa9e76d4cf425deb48102e4a2fd7`. Next and eslint-config-next move
16.3.6 → 16.3.8; the lock changes only their twelve package entries and root pins.
No unrelated dependency was refreshed. `deployment/bookplate/prepare.mjs` and its
checked security lock remain the reproducible canonical preparation mechanism.

`build.mjs --resolve` was the one-time reviewed lock resolution. Subsequent
builds consume the frozen lock, in a read-only Node 24.21.0 Alpine compiler with
2 CPUs, 4 GiB RAM, a 3 GiB executable RAM-only build filesystem, no build secrets,
and Next telemetry disabled. Initial compiler attempts hit Docker's default
no-exec tmpfs mount; explicit `exec` for the disposable compiler fixed that
environment issue. No application or production permissions were loosened.

`build.mjs`, `stage.mjs`, `check-bookplate.mjs`, then `verify.py` passed:

- 82 upstream unit tests in 19 files, plus the complete Turbopack production build.
- Two isolated accounts and a disposable RAM database; saved book, other-account
  isolation, anonymous denial, ZIP export and native deletion.
- Chromium library render and reload, without external browser requests or
  JavaScript errors in that journey. This is not a claim about every optional
  upstream integration or a real mobile device.
- Exact inherited image configuration; 2,981 files outside `/app` unchanged;
  public assets, migrations and native administrative helpers unchanged.
- Actual Next 16.3.8 payload and zero Next findings in the offline current scan.
  The pre-existing unfixed `http-cache-semantics` 4.2.0 / CVE-2026-93748 finding
  in the retained runtime is still reported; it was not hidden by this patch.

Candidate: `utilibre-bookplate:1.1.0-next1638-security-20261012`, image
`sha256:327ff5d3060ff7b0596f7b1ed7b31c95a357999e749d4bf503ba7fd1ce3c6a53`.
Frozen old runtime:
`sha256:9994dbe98020f667b88880041455efcd4e5cb08786427a8b7682f205869779af`.
The layer rebuilds the complete immutable app tree; it never mounts saved data.
Database, signup, privacy, upload and account settings remain unchanged.
The root maintainer owns production image-only release/rollback and publication.
`prepare-source.mjs` prepares the matching source archive without publishing it;
retain the previous public archive before atomically replacing it after release.

**Released at 00:39:58 UTC on 12 October.** Exact live image, preserved resolved
configuration, native health and backend/public route gates passed. Public
image-cache, sharing and telemetry paths remain denied. `publish-bookplate.mjs`
then published the 2,313,162-byte matching source archive and verified its
public HTTPS SHA-256 `0f1e47142a0c629fa8f56ff6a553566157ce3240af361dd58aa234df98267138`.
The old archive is retained privately. Rollback is the receipt's old image pin
and this one service's recreation; keep current account data and access controls.
Do not restore an old database over newer writes. Exact rollout details are in
`patch-leaves-final-20261012/release.json` in the private maintenance directory.

Before the patch, Bookplate already had no remote image hosts, no Cache
Components, and a production standalone server. Thus the image SSRF was not
exposed under the upstream's documented criterion. Updating the actual bundle
still removes the vulnerable implementation, including other patch-level
findings, rather than relying solely on that narrower configuration review.

## Reactive Resume: installed peer, not a Next server

Current image
`sha256:3a626fe8c04698c9cd85ae57ef562f0cfee2f10fb062bd3a72e440141e123a69`
is Reactive Resume 6.0.0. Its hash-bound native entry imports
`@hono/node-server` and serves the Hono `app.fetch`; PID1 runs that entry through
the existing verified OIDC-discovery wrapper. All 56 compiled server modules
lack Next and `better-auth/next-js` imports. The sole incoming symlink to the
installed Next 16.3.6 package belongs to Better Auth 1.7.7, which declares Next
an optional peer and exports the Next adapter separately from its root entry.
The reviewed application uses Hono, not that adapter. This conclusion is based
on positive startup/source/configuration evidence, not just a package-name grep.

`review-resume.mjs` rechecks the exact live image, mounted startup wrapper,
compiled entry, imports, optional-peer relationship and production process.
It prepares six **individual**, seven-day, exact-finding `not-affected` decisions.
It does not apply them or remove the package. Root applied the six validated
decisions after the 00:42 fleet scan, retaining the raw scan and prior ledger.
Every CVE requires a Next server
feature which this Hono deployment does not serve. Source-only findings and
other CVEs/images are not exempted. No Resume code, accounts or data were changed.

## Primary sources checked on 12 October 2026

The GitHub advisory HTML still contained placeholder patch versions in several
pages; the official GitHub advisory API and npm registry both identify 16.3.8.

| Finding | Upstream component / exact primary reference |
| --- | --- |
| CVE-2026-94483 | [Image optimizer remote-host SSRF](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) |
| CVE-2026-94484 | [SSG/ISR catch-all cache poisoning](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p) |
| CVE-2026-94485 | [App Router metadata image route](https://github.com/vercel/next.js/security/advisories/GHSA-f87g-xv8r-7p7x) |
| CVE-2026-94543 | [Pages Router SSG/ISR cache poisoning](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676) |
| CVE-2026-94544 | [Draft Mode cache fill](https://github.com/vercel/next.js/security/advisories/GHSA-3w37-wq28-93x7) |
| CVE-2026-94486 | [Development MCP endpoint](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv) |

[Pinned Resume native server source](https://github.com/reactive-resume/reactive-resume/blob/bc71f636c02a80ac6d731e17d2ee13501275295c/apps/server/src/index.ts)
and [Better Auth's native Hono integration](https://www.better-auth.com/docs/integrations/hono)
confirm the separate server architecture.
