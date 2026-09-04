# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Utilibre serves English- and Spanish-speaking people who would benefit from
useful free software but cannot reasonably operate their own server. Visitors
should be able to understand what is available, what happens to their data,
and how to obtain access without specialist knowledge.

Some services are anonymous. Persistent personal services may require an
operator-provisioned account. A future request process must be simple,
privacy-respecting, and clearly labeled; Utilibre must not imply that account
requests are open before that process actually exists.

## Product purpose

Utilibre is a bilingual public utility that operates selected Free and Open
Source Software. Its value is not the number of applications in the catalog.
Its value is removing a real access barrier: installation, configuration,
maintenance, monitoring, and safe public operation that an ordinary user
would otherwise have to provide.

The concise public promise is:

> Free hosted access to useful open-source software that normally requires
> your own server or a paid account.

Utilibre is not a startup, software marketplace, generic privacy brand, or
museum of healthy containers. Use is free. Donations may cover infrastructure
but never unlock features, increase priority, or change account decisions.
People who can afford an upstream project's official hosting should be
encouraged to support it.

## Service admission rule

Utilibre may operate an application when there is no stable,
project-operated, permanently useful free hosted service, or when the official
free tier is too restricted to make the application genuinely useful.

That access-gap test is necessary but not sufficient. A candidate must also:

1. be a complete, independently maintained, self-hostable FOSS application;
2. safely separate unrelated users when accounts or stored data are involved;
3. have reasonably bounded CPU, storage, and outbound-traffic costs;
4. let users export and delete their data where persistent data exists; and
5. avoid becoming an obvious spam, malware, open-proxy, credential-theft, or
   unlawful-file-distribution service.

Applications that already have a stable, useful official free service do not
belong in the operated inventory. A demo, trial, or severely restricted free
tier does not automatically close the access gap. Community instances are
considered useful context, but their temporary existence is not treated as a
permanent project-operated service.

The complete implementation and licensing requirements are in
[`FOSS_POLICY.md`](FOSS_POLICY.md).

## Current direction

The intentionally small operated set is:

- **SearXNG**, where additional independently operated instances contribute to
  the project's decentralized public infrastructure;
- **FreshRSS**, as a persistent feed reader for provisioned users once a
  documented request process is ready;
- **Redlib**, retained conditionally while it remains useful and operable
  within its disclosed upstream fragility and bandwidth risks; and
- **PrivateBin**, retained as a small ancillary encrypted-paste service rather
  than a headline product.

The deployment defines RSSHub only as internal support for operator-approved
feeds that make FreshRSS more useful. It has no public route or catalog entry,
but the stock runtime does not technically allowlist routes. That gap must be
resolved or explicitly contained before unrelated-user account requests open.

Applications removed by the strategic reset are not a pending release batch,
external directory, or active inventory. The earlier catalog expansion no
longer shapes the deployment or roadmap.

## Account model

Completely open registration invites disposable accounts and abuse;
permanently closed registration defeats the purpose of hosting persistent
applications. The intended middle ground is request-based access with:

- no payment or intrusive proof of need;
- transparent, conservative quotas;
- export and deletion paths;
- a published inactivity policy;
- clear backup, continuity, and retirement expectations;
- no uptime guarantee; and
- advance notice and reasonable export time when a service is retired where
  circumstances permit.

This is a product direction, not a statement that an account-request channel
is already operating. Persistent services remain provisioned-only until the
workflow, capacity, backups, and user-facing terms are ready.

## Positioning and voice

The public interface should feel like a precise, approachable public-service
directory. It should distinguish three things without ambiguity:

- services operated by Utilibre;
- internal infrastructure that supports those services; and
- ordinary external destinations opened from an operated application.

Privacy is explained through concrete data flow, storage, retention, and
operator-access facts. Utilibre does not claim anonymity, untraceability,
universal uptime, or complete security.

The voice is clear before clever: technically informed, calm, and understandable
to non-specialists. English and neutral Spanish are equal product languages.
Spanish copy uses natural wording, `« »` quotation marks, and “software
libre” where that term is appropriate. Hosted interfaces retain visible
upstream credit; Utilibre never implies authorship or affiliation.

## Product constraints

- Keep the operated catalog deliberately small.
- Put the visitor's task and access conditions before the project story.
- Never expose internal targets, credentials, container names, or private
  infrastructure details to the browser.
- Keep status statements point-in-time and avoid uptime promises.
- Add no advertising, behavioral analytics, tracking scripts, remote fonts,
  donor privileges, fake urgency, testimonials, or invented usage figures.
- Keep public applications independently stoppable and removable.
- Publish concrete data-handling, account, export, deletion, and retirement
  terms before accepting persistent user data.
- Omit a capability when no reviewed application passes the access, safety,
  sustainability, and licensing gates.

## Evidence and sources of truth

- `portal/src/catalog/catalog.ts` defines the public application inventory and
  bilingual service facts.
- `portal/src/catalog/upstreams.ts` records reviewed application provenance,
  source, license, and deployment state.
- Runtime configuration determines which reviewed entries are actually
  launchable; a catalog record alone is not evidence of deployment.
- `docs/services.md`, `docs/privacy.md`, and operational documentation describe
  the current boundaries. Historical test results are not evidence that a
  later release still passes.
- No testimonials, public uptime history, universal account access, or
  donation destination should be claimed unless independently configured and
  verified. Without a valid donation destination, its navigation, appeals,
  page, metadata, and aliases remain unavailable.

## Accessibility and inclusion

Use semantic landmarks and controls, logical heading structure, complete
keyboard navigation, visible focus, touch-friendly targets, sufficient
contrast, and useful error and status announcements. No information may
depend on motion, hover, color, or JavaScript alone when a practical static
alternative exists. Long Spanish copy, unavailable states, and account-access
conditions must wrap and remain readable at enlarged text sizes.
