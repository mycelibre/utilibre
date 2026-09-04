# Public capability policy

Effective 2026-09-03, Utilibre operates an end-user capability only when it is
provided by an independently maintained, self-hostable Free and Open Source
Software application **and** public operation removes a meaningful access
barrier.

This rule applies retroactively and to every future addition. The existence of
useful source code or a working container is not enough.

## Access-gap test

The default admission question is:

> Does Utilibre's hosting make useful FOSS accessible to people who otherwise
> could not realistically use it?

An application can pass when there is no stable, project-operated,
permanently useful free hosted service, or when the official free tier is too
restricted to make the application genuinely useful. A temporary demo or
trial is not a permanent free service. The existence of an unrelated
community instance is useful context, but not proof that a stable upstream
service exists.

An application that already has a reliable, useful official free service is
normally excluded from Utilibre's operated inventory.

## Required operating qualities

Passing the access-gap test is not enough. Before deployment, Utilibre must be
able to show that:

- one installation can safely separate unrelated users where accounts or
  stored data are involved;
- CPU, memory, persistent storage, temporary storage, and outbound traffic are
  reasonably bounded for the available infrastructure;
- users can export and delete persistent data;
- registration, upload, messaging, fetching, and proxy features can be
  constrained so the service is not an obvious spam, malware,
  credential-theft, open-proxy, or unlawful-distribution platform;
- backups, recovery, inactivity, retention, and service-retirement behavior
  can be explained before accepting user data; and
- operating a free instance complements the upstream project rather than
  obscuring or misrepresenting its paid hosting and support options.

If any of these conditions cannot be met, the application is omitted or kept
internal.

## FOSS and provenance requirements

A public application must also have:

- an identifiable upstream project maintained independently of Utilibre;
- complete source code under a verified FOSS license;
- a supported self-hosting path;
- an exact reviewed version, commit, image digest, or equivalent immutable
  artifact reference;
- documented data flow, storage, logging, external contacts, resource use,
  public-abuse risks, and maintenance expectations;
- visible upstream attribution and source access; and
- a reviewed provider record in the portal inventory.

A source-available repository, package, browser API, reusable library, or
container image is not by itself a qualifying public application.

## What Utilibre may write

Original Utilibre code is limited to integration glue:

- the bilingual catalog, navigation, accessibility, and explanatory pages;
- configuration and high-level status presentation;
- fixed routing to an approved application;
- narrowly scoped adapters needed to keep application credentials server-side;
- deployment configuration, security headers, rate limits, and documented
  compatibility or security patches; and
- tests and documentation for those integrations.

Glue must not become the implementation of the visitor's task. The current
Reddit URL router is permitted because it validates a destination and hands
the visitor to Redlib, which performs the task.

## Account policy

Open registration is not the default for persistent services. Before a
request-based account process opens, Utilibre must publish:

- who may request access and how requests are handled without intrusive proof
  of identity or need;
- quotas and prohibited uses;
- export, deletion, account-recovery, and inactivity behavior;
- backup scope and its limitations;
- the operator's technical access to server-side data; and
- retirement notice and export expectations.

Until that process exists, the public copy must say that access is
operator-provisioned. It must not imply that account requests are currently
open.

## Admission gate

Before an entry becomes launchable:

1. Document the access gap and why another operated instance is necessary.
2. Record the upstream, immutable artifact, license and self-hosting evidence,
   maintenance evidence, official hosted-service terms, and review date.
3. Complete the viability, security, privacy, abuse, resource, export,
   deletion, backup, and retirement review in
   [`docs/adding-a-service.md`](docs/adding-a-service.md).
4. Pin and privately test the exact artifact.
5. Add the provider and catalog records with accurate English and Spanish
   account, data, and external-recipient copy.
6. Add public routing only after the deployment and edge gates pass.
7. Run the focused FOSS-policy test, full portal tests, deployment validation,
   and documented live checks.

A catalog record, private listener, old test result, or license notice is not
evidence that a service is public. Runtime enablement, public routing, and
current checks must agree.

## Current application of the policy

The strategic review retains SearXNG, FreshRSS, Redlib, and PrivateBin as the
small operated set. RSSHub is internal FreshRSS support, not a public route
catalog. Its intended operator-approved route set is policy rather than a
technical allowlist in the current stock runtime, so that boundary remains an
account-opening gate.

Applications removed by the strategic reset are not pending releases or an
external directory. Old catalog, status, route, deployment, test, and license
inventory entries are removed with the application when no shipped code or
asset still requires attribution.
