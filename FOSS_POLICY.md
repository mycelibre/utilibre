# Public capability policy

Effective 2026-09-03, every end-user capability offered by Utilibre must be
provided by an independently maintained, self-hostable Free and Open Source
Software application.

This rule applies to the existing catalog and to every future addition. If a
suitable upstream application cannot be identified, licensed, reviewed,
self-hosted, and operated safely, Utilibre does not offer the capability.

## What qualifies

A public application must have all of the following:

- an identifiable upstream project maintained independently of Utilibre;
- source code available under a verified FOSS license;
- a supported way to self-host the complete application;
- an exact reviewed version, commit, image digest, or equivalent artifact pin;
- documented data flow, storage, logging, external contacts, resource use, and
  public-abuse considerations;
- visible upstream attribution and source access in the public catalog; and
- a reviewed provider record with `reviewStatus: 'deployed'` in
  `portal/src/catalog/upstreams.ts`.

A source-available repository, a package on npm, a browser API, or a FOSS
library is not by itself a qualifying application. Libraries may support the
portal or an upstream application, but they cannot be presented as the
provider of an original Utilibre tool.

## What Utilibre may write

Original Utilibre code is limited to integration glue:

- the bilingual catalog, navigation, accessibility, and explanatory pages;
- configuration and status presentation;
- fixed routing between a visitor and an approved upstream application;
- narrowly scoped adapters required to keep upstream credentials server-side;
- deployment configuration, security headers, rate limits, and compatibility
  patches around an approved upstream application; and
- tests and documentation for those integrations.

Glue must not become the implementation of the visitor's task. The current
URL router is permitted because it only validates a Reddit destination and
hands the visitor to the configured Redlib application. The Cobalt form and gateway are
permitted because Cobalt remains the application that resolves and processes
the request.

## Admission gate

Before an entry becomes launchable:

1. Record the upstream, immutable artifact, license evidence, self-hosting
   evidence, maintenance evidence, and review document in
   `portal/src/catalog/upstreams.ts`.
2. Complete the viability, security, privacy, license, resource, and
   maintenance review in `docs/adding-a-service.md`.
3. Pin and privately test the exact artifact.
4. Add the catalog entry and public attribution from the deployed provider
   record.
5. Run `npm run test:foss-policy`, the full portal test suite, deployment
   validation, and the documented live checks.

`npm run build` runs the focused FOSS policy test first. The catalog also
asserts the same invariant when imported. A launchable entry with no approved
application provider therefore fails closed.

## Retroactive application

The policy review retired 31 portal-native tool routes whose capability was
implemented by Utilibre code, browser APIs, or libraries. Their source,
dependencies, server endpoints, and public catalog entries were removed. The
existing independently maintained hosted applications remain available.
There are two visitor-facing glue surfaces: the Cobalt adapter and the
Redlib-only URL router. Cobalt is classified as a catalog service because
Cobalt implements the underlying task, while its `portalSurface` records the
glue UI explicitly; the router itself is an integration record.

Historical reports may describe the retired implementation. They are retained
as a record of what was tested at the time and must carry a superseded-policy
notice rather than being presented as current product documentation.
