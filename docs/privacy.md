# Privacy and data handling

This document describes the intended retained deployment. It is not an
anonymity, confidentiality, availability, or forensic-erasure guarantee.
Utilibre changes which server handles a task; it does not remove every network
intermediary or make an operator unable to access server-side data.

## Summary

| Surface | Utilibre receives | External recipients | Persistent state |
| --- | --- | --- | --- |
| Portal | Page/config/status requests and ordinary connection metadata | Cloudflare and the edge process public traffic | No account or request-history database |
| SearXNG | Search terms, options, preferences, headers, and limiter address | Selected search engines receive the query from the application VM | Re-creatable cache; optional browser preference cookie; limiter state is ephemeral |
| Redlib | Requested Reddit path, headers, challenge state, and optional preference cookie | Reddit receives corresponding server-side requests | Anubis challenge database/signing key and browser cookies; no Redlib content database |
| FreshRSS | Account credentials, subscriptions, reading state, preferences, API requests, and imports | Subscribed feed origins and source sites reached through internal RSSHub | FreshRSS files and PostgreSQL account/feed state |
| PrivateBin | Ciphertext, expiry/deletion metadata, request size, and ordinary connection metadata | No content recipient is required beyond the public ingress path | Ciphertext and metadata until expiry or deletion |
| Internal RSSHub | Route requests made from FreshRSS | Source sites used by the requested route | Re-creatable Valkey cache; no public account data store |

All public requests currently pass through Cloudflare and a separate Caddy
edge before reaching the application VM. Their handling and retention depend
on operator configuration outside these Compose projects. Network Error
Logging was disabled and its headers were absent in a recorded 2026-09-03
check, but releases must verify that state rather than treating it as
permanent.

## Portal

The portal sets no application cookie and includes no advertising, behavioral
analytics, tracking pixel, third-party script, or remote font. It has no
account or request-history database. Static requests can still be visible to
Cloudflare, the edge, host networking, and bounded application logs.

`/_portal/config` returns only sanitized public presentation values and enabled
service IDs. `/_portal/status` checks fixed internal targets and returns only
high-level state and a timestamp. Neither endpoint returns secrets, internal
addresses, response bodies, or resource details.

The browser-side Reddit URL router parses the supplied URL locally and creates
a link on the configured Redlib origin. It sends nothing until the visitor
opens that link.

## SearXNG searches

SearXNG receives the query, selected category/language/options, ordinary
headers, and the trusted client address needed for abuse limiting. It sends
the query and engine-specific parameters from the application VM to the
configured engines. Those engines see the application VM as the network
source, but still receive the query. Opening a result contacts the result site
directly.

The selected configuration uses HTML output and no public metrics or general
API formats. SearXNG's own access logging is expected to be disabled. A local
source-visible Python hook reduces accidental query disclosure in rendered
log records, but it is not proof that every future upstream code path will
redact every value. Review logs and the hook on every upgrade.

The root Valkey contains ephemeral limiter state and is not a query-history
database. Restarting it clears counters and can weaken limiting temporarily.
The SearXNG cache is re-creatable and is excluded from routine user-data
backups.

## Redlib and Anubis

A new ordinary browser normally completes Anubis's first-party challenge
before a request reaches Redlib. Anubis processes the requested path, network
address, user agent, ordinary headers, challenge state, and its authorization
cookie. It stores short-lived challenge records in a bbolt file and uses a
stable signing key. Freed database pages can remain until compaction even
after logical expiry.

Accepted requests reach Redlib, which receives the requested community, post,
search, settings, or media path and any optional Redlib preference cookie.
Redlib contacts Reddit from the application VM and proxies rendered content
and media back through Utilibre.

The upstream implementation emulates an official Reddit Android client and
browser/TLS behavior to obtain access. Reddit therefore receives emulated
client/device identity, tokens, requested content, and timing from the server.
Visitors do not supply a personal Reddit account to Utilibre. Reddit may block
the mechanism without notice.

Redlib has no database or persistent content volume. OAuth/device state is
process-local. Optional preferences and subscriptions can live in long-lived
browser cookies; they are not a Redlib account. Edge and application logging
must not retain full Redlib paths, queries, referrers, or cookies.

## FreshRSS accounts and feeds

FreshRSS is a persistent account service. It stores usernames, password
verifiers, configuration, feed subscriptions, reading/favorite state, labels,
and application metadata in its files and PostgreSQL. Depending on how a user
configures a feed, stored URLs or credentials can themselves be sensitive.
Users should not embed reusable credentials in feed URLs unless the risk is
understood.

FreshRSS contacts subscribed origins from the application VM on its refresh
schedule. Those sites receive the server's network address, requested feed
path, headers, and timing. Feed contents are stored and indexed for the user's
reader experience. The operator can technically access the application files,
database, logs, and backups; this must be stated before account requests open.

Access remains operator-provisioned. A request-based direction is planned but
not yet open. Before it opens, publish quotas, account recovery, export,
deletion, inactivity, backup, incident, and retirement terms. Deleting an
account from the live database does not immediately erase older backup copies;
the backup retention window must be disclosed.

## Internal RSSHub

RSSHub has no host port or public route. FreshRSS requests it over the internal
Docker network; RSSHub then contacts the route's source sites from the
application VM and may cache results in the private Valkey. Source sites see
the requested path, server address, headers, and timing.

The intended use is a set of operator-approved feeds, but stock RSSHub does
not enforce a route allowlist. A FreshRSS user able to submit an arbitrary URL
may be able to request other routes by Docker service name. Resolve or
explicitly contain that privacy/egress surface before unrelated-user accounts
open. The cache is re-creatable and ephemeral. Logs can still reveal route
names or source failures, so keep them bounded and do not place private
credentials in routes without a separate review.

## PrivateBin

PrivateBin encrypts and decrypts paste content in the browser. The HTTP request
contains ciphertext and metadata but not the URL fragment carrying the
decryption key; URL fragments are not sent to servers in ordinary HTTP
requests. Anyone who obtains the complete paste URL can normally decrypt its
content.

The server and ingress can observe connection metadata, timing, ciphertext
size, expiry, and paste/deletion requests. The configured service stores
ciphertext on disk, limits a paste to approximately 2 MiB, disables file
uploads and discussion, defaults to one-day expiry, and offers expiries no
longer than one week. Expired and deleted records can persist in backups until
those backups age out.

Because the operator cannot normally inspect plaintext, abuse response relies
on metadata, deletion capability, rate/size/expiry limits, and reports that
identify a paste safely. Do not ask a reporter to publish a full sensitive URL
in a public issue.

## Logs and operational measurement

Application containers use bounded Docker `json-file` logs by default. A size
rotation is not a promise of a fixed number of days. Keep log levels
conservative and do not enable full access logs merely to count visitors.

Aggregate service health, bytes, error rates, challenge outcomes, container
resource use, database size, and disk pressure are sufficient for most
operations. If additional metrics are retained, document them and avoid
client-address, path, query, cookie, user-agent, or session labels.

## Backups, deletion, and retirement

Routine user-data backups cover FreshRSS/PostgreSQL and PrivateBin ciphertext,
plus the secrets and configuration needed to restore them. Operators can read
backup files and must encrypt, restrict, rotate, and test them. SearXNG and
RSSHub caches are not user-data backups.

Live deletion, backup expiry, account export, and whole-service retirement are
different operations. The exact procedures and limitations are in
[`backups.md`](backups.md). Utilibre must offer reasonable export time before a
planned persistent-service retirement where circumstances permit.

## Incident response

If logs or backups may contain sensitive data, restrict access, preserve only
what is necessary for investigation, rotate affected credentials, and avoid
copying raw material into public issues. Publish a real contact/reporting path
before broad launch. Never promise confidentiality that the ingress provider,
operator access, upstream applications, or backups cannot technically provide.
