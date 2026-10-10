# PLANKA exclusion — 9 October 2026

The current PLANKA 2.2.1 [licence grant](https://github.com/plankanban/planka/blob/v2.2.1/LICENSE.md) is the PLANKA Community License/Fair Use licence, with third-party hosting/shared-use restrictions and separate Pro exclusions. It is not an unrestricted FOSS grant. This conflicts with Utilibre's explicit FOSS requirement, so no PLANKA instance was installed. An old unsupported AGPL build was not substituted. Reconsider only with a suitable current FOSS licence grant; a paid exception would change the project's requirement and was not inferred from “install all.”


## Recheck and direct-fork implementation attempt

At 02:55 UTC the official latest release remained 2.2.1, and current master retained the same Community/Fair Use grant. The official branches API listed master, gh-pages and dependency-update branches, with no supported AGPL maintenance branch. Current upstream advisories also include SSRF fixed in 2.0.0 and the static-file traversal fixed in 2.2.1; deploying an old 1.x image would not establish current security support. No licence notice was removed or rewritten.

A concrete FOSS continuation has completed an isolated native pilot: [La Suite Projects](https://github.com/suitenumerique/projects), maintained by the French ANCT/DINUM community, explicitly states that it derives from PLANKA 1. Its main revision 455aa274b44e63efa42840997ea4924b43eed533 (2026-09-16; package 1.3.0) carries GNU AGPLv3. The precise -only/-or-later suffix is not assumed from the licence appendix. This is named **Projects**, not misrepresented as current PLANKA. It provides a native Docker recipe, local accounts and OIDC configuration, local fonts, optional SMTP/webhooks, and configurable branding. No replacement identity system is needed.

The bounded isolated implementation lives in `deployment/evaluation/projects/`; its patched lockfile refreshes security-sensitive dependencies, and its compose recipe publishes no host port and uses an internal app/database/gateway network. No production hostname, existing account or public catalog entry is attached. See `docs/projects-pilot-2026-10-09.md` for actual build/test results and any remaining public-deployment conditions.

Primary evidence: [official releases](https://github.com/plankanban/planka/releases), [official advisories](https://github.com/plankanban/planka/security/advisories), and [Projects source](https://github.com/suitenumerique/projects/tree/455aa274b44e63efa42840997ea4924b43eed533). A maintained fork can solve the FOSS requirement; licensing cannot be changed by a local config patch.
