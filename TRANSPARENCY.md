# Transparency

Utilibre is an independently operated catalog and hosting layer for
independently maintained Free and Open Source Software applications. It makes
those applications easier to find and explains their data paths. Utilibre does
not create substitute end-user tools or inherit credit for upstream work by
running Docker Compose.

Original Utilibre code is glue only: cataloging, bilingual navigation,
configuration, disclosure, narrowly scoped gateways, testing, and security or
deployment integration. A programming library or browser API alone does not
qualify a new catalog tool. If no suitable self-hostable FOSS application can
be verified, Utilibre does not offer that capability.

## Upstream work

Each hosted application is identified by project, source, version, license,
purpose, and local-modification state in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md),
[`docs/licenses.md`](docs/licenses.md), and the second-stack
[`SOURCE_MANIFEST.md`](deployment/utilibre/SOURCE_MANIFEST.md). Where Utilibre
changes upstream behavior, the patch or equivalent source is kept in this
repository. Configuration-only changes are described as configuration, not as
a fork.

Visitors who choose to donate are also encouraged to support the upstream
developers. Utilibre pays for and maintains the hosting; most of the software
work happened elsewhere.

## AI-assisted development

This repository was developed with extensive assistance from OpenAI Codex,
including code, configuration, tests, documentation, and the frontend design
implementation. The operator supplied the product requirements, selected the
visual direction, made deployment and policy decisions, and authorized changes
to the systems in scope.

Automated tests, source review, browser checks, and bounded live operations are
recorded in the repository. No independent human security or code audit is
claimed. AI assistance is not evidence that the code is correct; neither is a
green test suite. Review the source and known limits before relying on or
deploying it.

## Service and privacy claims

The portal reports specific, implementation-backed facts rather than claiming
absolute privacy, anonymity, security, retention, or uptime. Some upstream
applications perform work in the browser; others necessarily reach Utilibre's
servers or outside providers. Cloudflare is the current public proxy and
processes ordinary connection and request metadata. Details and unresolved
verification duties are documented in [`docs/privacy.md`](docs/privacy.md),
[`docs/security.md`](docs/security.md), and
[`docs/services.md`](docs/services.md).

Use is free. There are no advertisements, behavioral analytics, premium
features, donor-only access, or donor priority. Donations are voluntary and
help cover infrastructure. Free to use. Not free to run.

## Corrections

Licensing, security, privacy, and operational criticism is welcome. The
[repository issue tracker](https://github.com/mycelibre/utilibre/issues) is the
current public contact destination. Reports there are public, so do not include
passwords, tokens, private keys, or other confidential material. A dedicated
mailbox can replace or supplement it when one is ready.
