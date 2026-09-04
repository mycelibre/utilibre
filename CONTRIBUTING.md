# Contributing

Contributions are welcome, particularly fixes that improve safety,
accessibility, bilingual parity, operational clarity, or upstream attribution.
Utilibre is a hosting and integration project, not a venue for original
end-user tool implementations.

## Non-negotiable service rule

Every visitor-facing capability must be provided by a complete,
independently maintained, self-hostable FOSS application, and Utilibre's
operation must remove a meaningful access barrier. Source availability, a
library, a browser API, or an npm package is not enough by itself.

Original Utilibre code may provide glue: catalog and navigation, localization,
status presentation, fixed routing, narrowly scoped credential-hiding
adapters, deployment policy, compatibility patches, tests, and documentation.
It must not perform the visitor’s underlying task. If no suitable upstream
application passes review, leave the capability unavailable.

Read [FOSS_POLICY.md](FOSS_POLICY.md) before proposing a service, and compare
the proposal with the deliberately small current inventory in
[docs/services.md](docs/services.md).

## Proposing an upstream application

Before implementing anything, document and verify:

- the official project, independent maintainer, FOSS license, and supported
  complete self-hosting path;
- an immutable release, commit, image digest, or equivalent artifact;
- maintenance activity, required state and credentials, resource and bandwidth
  costs, data flow, logs, retention, localization, and external contacts;
- public-instance risks such as SSRF, open proxying, arbitrary redirects,
  registration abuse, scraping, unbounded storage, and relay abuse; and
- why operating the application provides enough public value to justify its
  maintenance and risk.

Then follow [the service admission procedure](docs/adding-a-service.md). Add
the reviewed provider to `portal/src/catalog/upstreams.ts` before adding a
launchable catalog entry. Browser-side applications must pass the same gate;
the fact that their task runs locally does not make them exempt.

## Portal, copy, and language changes

- Preserve semantic HTML, keyboard operation, visible focus, sufficient
  contrast, reduced-motion support, narrow layouts, and Spanish text expansion.
- Keep English and neutral Spanish at parity. Follow
  [docs/copy-style.md](docs/copy-style.md) and
  [docs/adding-a-language.md](docs/adding-a-language.md).
- State data handling, accounts, limitations, and errors literally. Credit the
  upstream application clearly; Utilibre hosts it but did not create it.
- Keep the typed catalog and provider registry as the source of truth. Do not
  create a second hand-maintained service inventory in application code.

## Validation

Run the checks appropriate to the change. For portal work, the expected set is:

```sh
cd portal
npm ci --ignore-scripts
npm run test:foss-policy
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Service changes also require Compose validation, private functional checks,
resource observation, edge/firewall review, bilingual catalog verification,
and the public-path checks described in
[docs/adding-a-service.md](docs/adding-a-service.md). A green unit suite is not
a public-service security review.

Never commit `.env`, secrets, private addresses, access tokens, generated
runtime configuration, databases, uploads, logs, or backup archives.

## AI assistance and rights

Disclose material use of generative tools in a contribution and review their
output before submitting it. By contributing, you must have the right to
license your original contribution under AGPL-3.0-or-later. Upstream code and
assets keep their original licenses; do not copy them into Utilibre without a
documented, compatible basis. See [TRANSPARENCY.md](TRANSPARENCY.md) and
[docs/licenses.md](docs/licenses.md).

Use the [public issue tracker](https://github.com/mycelibre/utilibre/issues) for
proposals and ordinary bug reports. Do not put credentials, tokens, private
keys, private infrastructure details, or other confidential material in a
public issue.
