# Adding a public tool

Utilibre does not build end-user tools. It hosts independently maintained,
self-hostable FOSS applications and adds only the glue needed to catalog,
configure, route, secure, and operate them. The complete rule is in
[`FOSS_POLICY.md`](../FOSS_POLICY.md).

If the proposed capability has no qualifying upstream application, stop. Do
not implement it with browser APIs, a reusable library, copied snippets, or
original server code. A useful omission is better than a catalog entry whose
provenance has to be explained sideways.

## 1. Establish the upstream application

Verify all of the following from primary upstream sources:

- project and active independent maintainer;
- complete source and FOSS license, including the exact license variant;
- supported self-hosting method;
- exact release, commit, image digest, and build inputs;
- runtime assets, telemetry, CDNs, external calls, accounts, cookies, storage,
  retention, and logs;
- resource needs, public-abuse surface, update cadence, and rollback path; and
- modification/source-publication obligations.

A FOSS library is not a public application provider. It may be a dependency of
the portal or upstream application, but it cannot justify an original Utilibre
utility.

## 2. Pass the service-admission review

Follow [`adding-a-service.md`](adding-a-service.md) for viability, deployment,
network, security, privacy, license, localization, resource, and private-test
requirements. Static browser applications still follow that process: their
visitor data may stay local, but their build, runtime assets, CSP, external
requests, and update path still require review.

Do not expose a generic proxy, arbitrary network target, anonymous receiver,
or account system merely because an upstream supports it. Configure only the
public surface that fits the documented threat model and available resources.

## 3. Register the provider before the catalog entry

Add a reviewed public-application record with `reviewStatus: 'deployed'` to
`portal/src/catalog/upstreams.ts` only after the review passes. Record:

- official project and source URL;
- license and every applicable license-evidence URL;
- exact reviewed source and immutable artifact reference;
- official self-hosting and current-maintenance evidence;
- the repository review document;
- exact installed version;
- self-hosting integration type;
- approval state and review date; and
- the invariant that the maintainer is independent of Utilibre.

Then add the bilingual catalog entry. It must reference the deployed provider;
visible name, source, license, and version metadata come from that record. A
deferred provider may be documented but cannot become launchable.

Original portal code is permitted only for a narrow integration. Set
`portalSurface: 'integration-glue'`, document why the upstream application
still performs the actual task, and keep the adapter smaller than the
capability it exposes. Use `kind: 'integration'` and
`implementation: 'integration-glue'` when the catalog record itself is only a
router. A service such as Cobalt remains `kind: 'service'` and
`implementation: 'upstream-application'` because the upstream application
performs the task, even though its portal surface is glue.

## 4. Validate and release

Run from `portal/`:

```sh
npm ci --ignore-scripts
npm run test:foss-policy
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm audit
```

`npm run build` invokes the FOSS policy test before Vite. Also run Compose
validation, private deployment checks, the upstream application's functional
acceptance tests, and the documented public-path checks. Confirm English and
Spanish copy, keyboard use, narrow and wide layouts, loading/failure states,
source attribution, and every claimed data boundary.

If the application later becomes unmaintained, changes license, adds
unacceptable telemetry, exceeds safe resource limits, or cannot be operated
without weakening the boundary, mark it deferred and remove its launch URL.
