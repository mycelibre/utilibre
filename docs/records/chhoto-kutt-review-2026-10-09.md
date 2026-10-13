# Chhoto URL and Kutt, 9 October 2026

**Keep the installed Chhoto service for now. Do not add a second shortener or
move existing links as part of this review.** Kutt offers useful account-level
management, but the current release has no native switch that stops its visitor
analytics. A switch would need a privacy patch, dependency repairs and a tested
link migration. This is a source assessment, not a failed Kutt installation.

## Exact revisions and scope

- Installed: [Chhoto URL 7.8.3](https://github.com/SinTan1729/chhoto-url/tree/e18a8a0111e94be03145e95c30dcd7f41891633d),
  Utilibre p3. MIT. The [deployment record](chhoto-deployment-2026-10-09.md)
  documents the live native tests, backup restore, privacy patch and public
  mobile layout correction.
- Reviewed alternative: [Kutt v3.2.6](https://github.com/thedevs-network/kutt/releases/tag/v3.2.6),
  commit `6ca803373a3c95f1a92674e9066175aff96cb772`, the current release returned
  by the upstream API. Its root `LICENSE` and package agree on MIT.
  Main `279b491b53bbd01fbae70f603222526962772061` was also compared for the
  configuration, redirect, visit-queue and dependency files; it does not add an
  analytics opt-out or change the reviewed dependency set.
- Only a source checkout and package-lock audit were used for Kutt. No service,
  account, database, network, email or existing shortlink was created or changed.

## Function and privacy comparison

| Requirement | Installed Chhoto p3 | Kutt v3.2.6 source |
| --- | --- | --- |
| Anonymous short links | Enabled; creation is rate-limited and expiry cannot exceed 30 days. | Native option exists, disabled by default. |
| User-owned link management | No user accounts or anonymous deletion token; private operator removal is available. | Native accounts, link list/edit/delete, API keys, password-protected links and custom domains. Native OIDC exists, including a configurable login button. |
| Visitor statistics | The tested patch prevents increment enqueue and per-click debug logging; counters are hidden as a consequence. | Owner-associated links enqueue user agent, client IP, optional Cloudflare country header and referrer. The worker increments the total, derives browser/OS/country/referrer and stores hourly aggregates. These are visitor analytics even though raw IP is not a column in the aggregate table. |
| Native analytics disable | Upstream counter behaviour is removed by the existing small reproducible patch. | No off switch in `server/env.js`, `.example.env` or the current redirect paths. Turning Redis off runs the same visit processor in-process. Hiding the Stats page would not stop collection. |
| Anonymous-link statistics nuance | New redirect counters remain zero. | Normal anonymous links have no owner ID and skip the visit queue; that does not make authenticated account links tracking-free. Protected-link submission has its own enqueue path. |
| Database requirements | One SQLite database; existing online backups and isolated restore passed. | SQLite by default; PostgreSQL/MySQL and Redis are optional. A PostgreSQL/Redis deployment is not inherently required. |
| Export and deletion | Operator SQLite backup is the tested recovery method. Visitors retain the original and short URL; there is no account library/export to promise. | Authenticated, paginated `GET /api/v2/links` returns link records. Native create/edit/delete APIs exist. No dedicated full portable export/import or Chhoto importer was found in the reviewed routes, views or API specification. Account deletion deletes the user; the declared foreign keys cascade to owned links and visits. This was source-checked, not runtime-tested. |

Evidence: pinned
[redirect handlers](https://github.com/thedevs-network/kutt/blob/6ca803373a3c95f1a92674e9066175aff96cb772/server/handlers/links.handler.js),
[visit worker](https://github.com/thedevs-network/kutt/blob/6ca803373a3c95f1a92674e9066175aff96cb772/server/queues/visit.js),
[queue selection](https://github.com/thedevs-network/kutt/blob/6ca803373a3c95f1a92674e9066175aff96cb772/server/queues/queues.js),
[configuration](https://github.com/thedevs-network/kutt/blob/6ca803373a3c95f1a92674e9066175aff96cb772/server/env.js),
[API definition](https://github.com/thedevs-network/kutt/blob/6ca803373a3c95f1a92674e9066175aff96cb772/docs/api/api.js),
and `server/{models,queries}/{user,link,visit}.*.js`. No upstream hosted Kutt
service was used. Upstream warns that its former `kutt.it` domain is no longer
under its control; reviewed links point to its repository.

## Dependency and migration findings

The release's production package-lock audit on 9 October reported **12 affected
dependency entries: 2 critical, 4 high and 6 moderate**. This includes transitive
chains, so it is not 12 independently exploitable application vulnerabilities.
Reported packages include Handlebars/proxy-addr, MySQL2, NanoID and Nodemailer;
optional database/mail paths need their own applicability review. The current
main revision uses the same reviewed dependency set. Do not blindly run
`npm audit fix --force`: its suggestions included downgrading Bull and hbs.
No Kutt repair or runtime exploitability test was attempted in this assessment.

Chhoto's existing audit exception is also retained: `h2 0.3.27` has
`RUSTSEC-2026-0258`; its public gateway forwards only HTTP/1.0 to the isolated
backend, excluding that HTTP/2 request path from the deployed ingress. This is
a documented applicability limit, not a claim that the dependency is fixed.

A future replacement must preserve the hostname and each short path, original
destination including query/fragment, expiry, notes and administrator controls.
Kutt has a different schema and native creation rules; copying a Chhoto SQLite
file into it is not a migration. Its authenticated API can represent many link
fields, but schema differences, ownership, reserved paths, address collisions,
expiry/time conversion and rollback need a fictional round trip before touching
real links. No migration compatibility or import completeness is claimed here.

The useful reason to reconsider Kutt would be a requirement for individual
account/SSO link ownership. First require a verified zero-analytics configuration
or a narrow, maintained patch that stops both enqueue paths and visitor-data
derivation, then repair the applicable dependencies and test native account,
export, deletion and preserved-link behaviour. A second parallel shortener does
not resolve those requirements and would duplicate the current service.

Private source/audit evidence:
`/opt/utilibre/evaluation-src/kutt-3.2.6` and
`/opt/utilibre/reports/simplelogin-security-20261009/followup/kutt-*`.
No actual shortlinks, credentials or private destination URLs were inspected.
