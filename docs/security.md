# Security review

Utilibre is an Internet service even though application listeners are private.
The threat model assumes malicious input, automated scraping, credential
stuffing, spam, oversized requests, storage exhaustion, upstream blocking,
container compromise, and operator error. This document records controls and
residual risks; it is not a claim of complete security.

## Current maintenance status, 12 October 2026

The running-image, host-package and listed source-manifest scans now complete;
the earlier execution/inventory failures described below are historical.
Application advisory decisions are bound to exact deployed artifacts, and
dependency findings retain separate, expiring evidence. Native compatibility
repairs and their workflow checks are recorded in the
[current operator queue](work-queue.md). That record also identifies outstanding
vendor fixes, caller limitations and boot-chain requirements; this is not
a claim that all vulnerabilities are fixed.

The 20:10 UTC scan and current exact reviews leave 75 high package-target
records across ACL, two GnuTLS advisories and GRUB. The earlier host libmount
activation dependency is closed after verified fresh mappings. GnuTLS native
controls reproduce the defects in three installed variants; no compatible
maintained fix was identified. ACL/GRUB continuations were stopped by automatic
security review and remain incomplete. None is hidden by a waiver.

Grist now supplements image scans with its exact Deno release-source lock and
metadata from shipped Pyodide wheels. Runtime/configuration fingerprints reopen
source findings after changes, and failed scans cannot inherit an old decision.
Two DNSSEC source matches have a tested, expiring permission-boundary mitigation,
not a library patch. Complete linked Rust and native Python/WASM inventories
remain unavailable. See the [inventory record](../deployment/maintenance/sandbox-inventory/README.md)
and [GnuTLS assessment](../deployment/maintenance/gnutls-assessment/README.md).
Separate Proxmox and Caddy hosts are not included in this VM's scans.
Future update and patch-retirement gates are in [source-patches.md](source-patches.md).

## 11 October maintenance follow-up

The earlier scanner execution failure and omitted runtime targets were repaired.
A stricter coverage gate now exposes a separate unresolved gap: Penpot's native
backend removes its OS package inventory, and Trivy discovers no packages in
the static Chhoto/Rustpad images. Java/source-lock scans do not establish full
binary/OS coverage, and the service reports incomplete until that is remedied.
Published Penpot/Yopass notices have exact-version/configuration dispositions,
not blanket exceptions; full published history is considered. The dependency
queue remains open after substantial staged updates. Exact runtime changes,
isolated account/restore tests, sources and rollback boundaries are in
[the latest maintenance record](updates.md#parallel-security-release--11-october-2026).

Additional hardening includes PrivateBin's tested sanitizer backport, current
coturn, runtime/vendor updates, Authentik/Linkding's patched JWT libraries and a
verified proxy-address spoof fix. The subsequent Rallly, Kuma, Resume, Penpot
and FerretDB dependency builds have isolated native workflow checks. They do
not clear unreviewed compiled bundles, vendor-unfixed libraries or Grist's old
forked sandbox. Private decisions require exact artifact
identity, evidence and expiry; changed code reopens the finding. The unused
ksmbd autoload guard does not claim a patched kernel. No compromise assessment,
zero-vulnerability certification or security guarantee follows from these tests.

## October 8 Rallly advisory and disclosure controls

The running image was inspected as 4.15.3 before action. Upstream release
4.15.4 identifies the critical unauthenticated preview-route RCE affecting
4.8.0–4.15.3. The instance was upgraded to the then-current fixed release,
not downgraded to an arbitrary historical minimum:
`lukevella/rallly:4.15.4@sha256:8f29eccdc2fbb856001ea3c97d1c1d85556095274ad21a8de0c0125f29303938`.
Running Next.js is 16.3.8. Upstream was rechecked on 8 October at 22:31 UTC.

A private PostgreSQL custom dump, pre-change schema/config and rollback image
reference were retained before the isolated service update. Schema comparison
showed no migration change. Public login and a benign generated preview PNG
passed after updating; the temporary route mitigation was then removed.
No exploitation test was run against production and this is not a finding
about past compromise. See the release and advisory:
https://github.com/lukevella/rallly/releases/tag/v4.15.4 and
https://github.com/advisories/GHSA-vcvr-r3jv-pc5j .
Private evidence: `/opt/utilibre/reports/rallly-security-20261008/`.
If rollback is necessary, restore the preview-route mitigation before starting
the affected image; do not reopen an unmitigated affected release.

Private GitHub reporting was enabled and verified. `admin@utilibre.org` is the
existing non-GitHub contact; SMTP recipient routing passed without sending a
message. The operator confirms inbox receipt and monitoring, and reports no
explicit message or mail-backup expiry settings. Provider defaults and delegated
access remain unverified; no fixed deletion period is promised.
The root security.txt expires 30 September 2027; the build checks its structure
and requires at least 31 days remaining. Renewal includes a contact review.
The public policy includes hosted upstream vulnerabilities and bounded good-faith
research. Abuse templates, handling limits and unresolved legal questions are
in `abuse-handling.md`. Subdomain discovery requires an explicit response or
redirect on each intended host; the root file alone does not provide discovery.
All 55 intended HTTPS subdomain redirects are now verified; see
[security-discovery.md](security-discovery.md) for transport and test boundaries.

## October 7 browser tool boundary

ZIP Manager, RAWGraphs, AudioMass and miniPaint serve static applications only
on private ports 3160–3163. Their actual peer allowlist is enforced inside the
static server, independently of forwarded headers. Other methods than GET/HEAD
are rejected; unknown paths are real 404s. Read-only, non-root containers have
fixed resource limits and no user-upload directory. Same-origin CSP denies
remote scripts, assets, frames and form submissions; only AudioMass has
same-origin microphone permission. RAWGraphs CSV parsing works without eval.
Cloudflare security scripts can still be added by the separate public edge.

The firewall helper includes the four ports for operator review, but it was
**not applied** automatically. Build-only dependencies are not a production
Node server; old build-tool audit findings still require maintenance review.
Static delivery does not make a vulnerable browser dependency harmless. The
specific updates, tests and residual findings are in the toolbox review.

## Boundary summary

- HTTP services use the separate Caddy edge, most through Cloudflare HTTP proxying.
  The 12 October 2026 DNS-configuration check confirms that Search, Binternet,
  newsletters and aliases are also HTTP-proxied; earlier DNS-only web observations
  are historical. TURN and Mumble retain DNS-only records, distinct native
  media/voice listeners and scoped firewall rules.
- Application listeners bind to one exact private address and accept traffic
  only from the exact edge peer.
- Databases, caches, RSSHub, Anubis metrics, and direct Redlib have no host or
  public port.
- Containers drop capabilities and use `no-new-privileges`, read-only roots,
  bounded tmpfs, resource ceilings, and rotated logs where their official
  images permit it.
- The portal exposes only static files and fixed config/status endpoints; it
  has no generic proxy, upload, webhook, DNS, or media API.
- Persistent state now also includes invited-account applications, CryptPad,
  LiberaForms, polling and FMD. The current catalog, export guides and
  `backups.md` define their separate data and recovery boundaries.

## Edge and proxy trust

The application VM must not be directly reachable from the Internet. Caddy
must overwrite forwarded-client headers and derive addresses only from trusted
Cloudflare ranges. Applications trust only the exact edge peer. A spoofable
client header can defeat limiting or Anubis policy.

Public DNS points only to the edge. Firewall verification must include Docker
forwarding/NAT behavior, unauthorized private hosts, and IPv6. See
[`firewall.md`](firewall.md) and [`edge-routing.md`](edge-routing.md).

## Portal

The portal server rejects malformed targets, declared bodies on bodyless
routes, excess headers, unsupported methods, and unknown API paths. It has
short header/request timeouts, connection ceilings, fixed status targets, and
a restrictive CSP. Public config is sanitized and does not expose secrets or
internal destinations.

Retired APIs and application routes must remain absent. In particular, do not
restore a generic fetcher, media adapter, webhook receiver, DNS resolver, or
network-scanning surface for compatibility with old links.

## SearXNG

Primary risks are search automation, engine fan-out, slow upstreams, image
proxy bandwidth, query disclosure, and engine bans. Controls include the
official limiter, exact trusted proxy, private Valkey, curated engines, HTML
output, no public metrics/general API formats, query-log redaction, and
container resource limits.

Limiter state is ephemeral and clears on restart. The local logging hook is
defense in depth, not a proof that every future upstream log line is safe.
Review engine behavior, limiter parsing, output formats, image proxying, and
logs on every version change.

## Redlib and Anubis

Redlib is a crawler and media-relay risk. Anubis adds browser work before most
requests but does not stop distributed automation or volumetric traffic.
Cloudflare remains the outer traffic boundary. Direct Redlib and Anubis
metrics stay container-only.

The upstream Redlib implementation emulates a Reddit Android OAuth client and
browser/TLS behavior. This is an explicit operator-approved exception, not a
pattern for new services. Reddit can block it, and its behavior must be
re-reviewed on every pin. The local source build applies redirect hardening;
keep the patch and regression tests with the complete corresponding source.

Preserve Range/streaming behavior only on the Redlib route, observe aggregate
bandwidth, disable indexing, and stop the pair if abuse or upstream blocking
becomes unreasonable. Do not log complete browsing paths or cookies.

## FreshRSS

FreshRSS creates the largest account-security responsibility in the retained
set. Keep public self-registration closed. Require strong generated initial
credentials, transport all public use through HTTPS, protect the admin
account, and keep database credentials out of browser and edge configuration.

Before request-based accounts open, verify:

- unrelated users cannot read, share, export, or delete one another's data;
- login, recovery, API-password, session, CSRF, and brute-force behavior;
- safe import size and type limits;
- whether arbitrary feed fetching can reach private, loopback, link-local,
  cloud-metadata, Docker-service, or credential-bearing URLs;
- whether redirects, DNS rebinding, or feed enclosures cross the intended
  egress boundary;
- account quotas, deletion, export, inactivity, and incident procedures; and
- restore tests that do not overwrite live user state.

FreshRSS legitimately needs the internal backend for PostgreSQL and intended
RSSHub feeds. That makes server-side feed fetching and SSRF review especially
important. Do not call the installation safely open to unrelated users until
this gate passes.

## Internal RSSHub

RSSHub has no public route or host port. Its generic route catalog is not a
public product. Only operator-approved routes needed by FreshRSS should be
documented or used. Disable unsafe user-supplied domains, remote debugging, hotlink
templates, and file logs; retain request deadlines, cache bounds, resource
ceilings, and private Valkey.

An authenticated FreshRSS user may still be able to attempt internal RSSHub
routes by subscribing to a Docker-network URL. Treat that as part of the
FreshRSS/RSSHub multi-user and SSRF gate, not as proof that network privacy
alone is sufficient.

## PrivateBin

PrivateBin's server stores encrypted content, so the operator normally cannot
moderate plaintext. Anonymous creation can attract illegal or abusive data,
link spam, storage exhaustion, and request floods. Attachments are enabled with
a 25,000,000-byte browser admission limit and a 35,000,000-byte native encrypted
payload limit, allowing for encoding overhead. Direct clients cannot bypass the
server's ciphertext limit, but it cannot inspect encrypted raw file sizes.
Expiry is at most one week (one day by default); discussion stays disabled.
Native traffic limiting, request-body bounds, expiry cleanup, a dedicated
10 GiB project quota, low-space admission and a safe abuse/deletion procedure
provide separate controls. These are not per-user slots or a concurrency promise.
See [attachment and expiry checks](records/privatebin-uploads-2026-10-10.md).

Encryption does not authenticate a paste sender, prevent someone with the full
URL from reading it, hide request metadata, or erase backup copies
immediately. Do not log full paste or deletion URLs.

## Accounts and authorization

FreshRSS access remains operator-provisioned. A planned request-based model is
not open registration. Before announcing requests, publish eligibility,
quotas, recovery, export, deletion, inactivity, backup, acceptable-use, and
retirement terms. Account decisions and limits must not depend on donations.

Administrative interfaces should not be linked from the public catalog. Use
separate strong operator credentials, minimal operator access, and a recorded
offboarding/rotation procedure.

## Secrets

- Keep `.env`, Anubis keys, PostgreSQL credentials, and FreshRSS credentials
  outside version control with restrictive permissions.
- Generate secrets locally; never paste them into issues, logs, screenshots,
  shell history, or expanded Compose output.
- Rotate credentials after suspected exposure and document which state must be
  invalidated or restarted.
- Keep the public AGPL source offer free of secrets while including all source,
  patches, and build/install material required by the licenses.

## Persistence and backups

Saved account work keeps recovery backups, which may contain sensitive
plaintext or encrypted documents. Encrypt those backups, restrict operator
access, keep them outside the live data paths, test restores in isolation and
expire generations under the documented policy.

PrivateBin's expiring content is excluded from new application backups; its
configuration is recoverable, not new paste contents. Its current data lives on
the separate temporary-content disk, whose Proxmox backup exclusion is
owner-confirmed. Other temporary services have their own explicit boundaries in
[backups.md](backups.md). Older backups and externally managed snapshots were
not silently deleted: expiry/unlinking does not prove erasure of historic copies
or physical media. Account deletion likewise cannot instantly remove older
account backups.

Never solve a low-disk event with an unreviewed recursive delete or broad
Docker prune. Stop the affected service, identify exact growth, preserve needed
state, and use the documented removal procedure.

## Update and supply-chain controls

Pin images by immutable version and digest; pin Redlib source and build bases.
Review upstream release notes, license, artifacts, dependencies, migration and
rollback behavior before updating one application at a time. Re-run security,
privacy, localization, resource, and public-path checks. Generic unattended
image replacement and floating `latest` tags are not permitted. SearXNG is the
documented exception: its existing guarded updater resolves an immutable
candidate, runs the required checks and retains rollback. Other updates remain
reviewed; native package protections prevent unattended replacement of retained
repairs, but cannot prevent an administrator bypassing those safeguards.

## Incident priorities

1. Remove the affected public route or stop the service without widening any
   other boundary.
2. Preserve the minimum evidence needed, without copying sensitive queries,
   paths, credentials, or paste URLs into public channels.
3. Rotate exposed secrets and invalidate affected sessions where possible.
4. Restore only from a verified, isolated backup when integrity is understood.
5. Notify affected users when the incident and available contact information
   make that appropriate.
6. Document the factual impact and update controls before re-enabling access.

## Residual risks

Cloudflare processes proxied HTTP hostnames, including Search, Binternet,
newsletters and aliases as verified on 12 October 2026. This includes ordinary
HTTP content visible at its TLS termination, not just authoritative DNS queries.
Native TURN/Mumble listeners have separate DNS-only paths as described above. The Caddy
edge handles hosted HTTP services. Upstream engines and sites can log server requests; Redlib can break or be blocked; FreshRSS feed fetching
has an SSRF and content-ingestion surface; anonymous encrypted pastes can be
abused; container and dependency vulnerabilities remain possible; and an
operator with host or backup access can access persistent server data. These
risks must remain visible in public copy and operating decisions.
