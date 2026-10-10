# Projects isolated evaluation

This is **La Suite Projects**, a maintained continuation of PLANKA 1. It is not the differently licensed PLANKA 2. The evaluation pins `suitenumerique/projects` revision `455aa274b44e63efa42840997ea4924b43eed533`, whose package version is 1.3.0. That main revision is not represented as a tagged release. See [the verification record](../../../docs/projects-pilot-2026-10-09.md).

No host port, production hostname, mail delivery or real account is enabled. The compose network is internal. Application egress is further restricted to its own database; gateway egress is restricted to the application. All test records use fictional data.

## Reproduce

Run from the repository root, with Docker, Python requests, the repository's existing Playwright installation, `nsenter` and iptables available:

```sh
python3 deployment/evaluation/projects/initialize.py
sh deployment/evaluation/projects/rebuild.sh
docker compose -f deployment/evaluation/projects/compose.yaml up -d --wait
sh deployment/evaluation/projects/boundary.sh
python3 deployment/evaluation/projects/check.py
node deployment/evaluation/projects/check-browser.mjs
python3 deployment/evaluation/projects/check-boundary.py
```

Initialization refuses to overwrite existing pilot credentials. They live only in `/opt/utilibre/evaluation/projects-20261009/private/pilot.env`, mode 0600. Reports and fictional screenshots go to `/opt/utilibre/reports/planka-fork-20261009/`. The browser maps the reserved `projects.invalid` name to the unpublished gateway's private address. Tests never contact the fictional external image URL: CSP blocks it and the browser harness separately aborts non-instance requests.

The Dockerfile uses pinned Node 22 and PostgreSQL images. Build steps use npm 11.19.1, matching the lockfile generation version, and preserve upstream's existing `patch-package` patches. The bounded build uses two CPUs and 3 GiB. Legacy Docker builder is selected because this VM's BuildKit snapshot metadata failed; no global cache cleanup is needed. Runtime ceilings are app 512 MiB/one CPU, database 256 MiB/half a CPU, gateway 64 MiB/quarter CPU. Logs rotate by size, not by a promised time period.

`security-dependencies.patch` contains package/lockfile maintenance only. It refreshes server dependencies and React Router; it does not replace the application or authentication. Apply/reverse uses `git apply --unidiff-zero`. Remove the patch after a reviewed upstream revision supplies compatible fixes, then repeat the native and browser checks. Native attachment storage is mounted at the actual production path `/app/attachments`; the upstream Docker recipe's different volume path is not copied.

## Prepared integration, not activated

`configure-oidc.py` follows the existing authentik provisioning convention. It creates only a Projects client/application, reuses the approved-user and verified-email policies, and writes generated credentials privately. It has **not been run**. `oidc.env.example` selects native OIDC, minimal signed ID-token claims and the existing identity host. It does not enable SMTP, external webhooks, S3, third-party widgets or an organization-claim integration.

`prepare-production-gateway.py` reproducibly writes `nginx-production.conf` for the proposed `projects.utilibre.org` host. This file is not mounted by the pilot. Both gateway variants preserve native WebSockets and downloads, impose a 10 MiB request limit, disable access logging, apply same-origin CSP, and allow robots discovery of noindex. The native app has no configurable per-upload byte ceiling; the gateway supplies that boundary. The per-request limit is not a total account/storage quota.

Before public integration, provision and test native OIDC against existing authentik with fictional approved and unapproved accounts; bind a scoped gateway through the existing edge; permit app egress only to its database and the existing identity endpoint; include state in the established backup schedule with its actual retention; and publish accurate storage/deletion notes. The current upstream login button carries ProConnect branding even when another OIDC issuer is configured. It has no label setting; changing that label needs a small separate branding patch, not a new authentication form.

Do not claim that native Delete immediately erases every record or file. Project/card deletion archives records, and project deletion can retain attachment files. Explicit attachment deletion removes its live file while archiving metadata. No scheduled archive/session purge was found in the inspected source. User exports are not verified; operator PostgreSQL/filesystem recovery is a separate capability.

## Stop and remove the disposable runtime

Only this evaluation contains disposable state. Never reuse these removal commands for production:

```sh
docker compose -f deployment/evaluation/projects/compose.yaml down --volumes
```

After confirming the private environment still names `pilot@example.invalid` and `projects.invalid`, remove only `/opt/utilibre/evaluation/projects-20261009/` if the fictional state is no longer needed. Keep source, recipes, image and reports for review. No existing service, real account, backup or production volume is part of this cleanup.
