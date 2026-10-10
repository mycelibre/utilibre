# GNU licence precision review, October 8–9, 2026

This supplements the existing [licence inventory](licenses.md) and catalog
provider ledger; it is not a new software registry. The reviewed revision for
each application remains in `portal/src/catalog/upstreams.ts`.

A GNU licence text identifies a licence family and version. Its generic
“How to Apply These Terms” example is not, on its own, a project-specific
“or later” grant. Deprecated SPDX identifiers remain valid and have defined
meanings; deprecation is not evidence of an unknown licence. A formal npm or
Composer licence declaration can therefore support normalization, while a
generic README phrase, detected badge or conflicting declaration needs separate
review. See the [SPDX clarification](https://spdx.dev/license-list-3-0-released/)
and the declared-metadata correction below.

The portal therefore uses precise SPDX identifiers where supported and an
explicit human-readable GNU licence description where the version scope is
unconfirmed. The latter is deliberately not presented as an SPDX identifier.
The closed FOSS policy still requires a reviewed independent, self-hostable
application, pinned source/artifact, and licence evidence. This review does not
admit an unknown or nonfree licence or change an upstream grant.

| Application | Installed source reviewed | Result / evidence |
| --- | --- | --- |
| BentoPDF | `f96cd4e5166f3d51393dfe9f3c440b5bb77802f1` | `AGPL-3.0-only`: root package explicitly declares this identifier; root licence retained. |
| Rallly | `4b61a00b1abcbe480d6b3992b5d98b01754e90c6` / 4.15.4 | `AGPL-3.0-or-later`: pinned README License section explicitly grants version 3 or any later version; the fixed release was fetched and reviewed. |
| FreshRSS | 1.29.1 / `b2c50115baa36c217e939ee3ea8ecfae52f91abd` | `AGPL-3.0-only`, normalized from the application's formal Composer/npm `AGPL-3.0` declarations. Minz-specific later-version headers remain intact and do not change the declared whole-application licence. |
| Kittygram | `5931c21c0990d4b216e97166dd78c03c9965567a` | GNU AGPLv3; README and rockspec use a bare identifier; no project-specific version-scope grant found. |
| Rimgo | `d2be8e221522dfe7a06452e2002dcf6dad569d1a` | GNU AGPLv3; README declares version 3 without establishing later-version scope. Staged access remains staged. |
| Binternet | `9bb70ef26c8b79a315e77b79bfd346433d55cbb6` | GNU GPLv3; root licence present; no project-specific version-scope grant found. |
| DeGoog | `4a9bcc74f0fceaa33efbab4777f063274cce23d6` | GNU AGPLv3; root licence present. A separate LGPL later-version comment covers imported ClearURLs rules, not all of DeGoog. |
| SafeTwitch | `ddee63ebbe8b7b74d8f6ed3869cd7958934746d7` | GNU AGPLv3; root licence present; no project-specific version-scope grant found. |
| GotHub | `24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2` | GNU AGPLv3; root licence present; no project-specific version-scope grant found. |
| Priviblur | `251a8e67c64d792b3c8c141860ccaa227ce62e4d` | GNU AGPLv3; README declares version 3 without establishing later-version scope. |
| BreezeWiki | `6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4` | GNU AGPLv3; root licence present; no project-specific version-scope grant found. |
| PairDrop | `4862ba3067be1a0f2e0d1e94861dc9200b5bfeea` | Root GNU GPLv3 licence retained; version scope unconfirmed. Root `package.json` says ISC, conflicting with the root licence. Do not infer that the entire application is alternatively available under ISC. |
| VERT | `c7b9f3921d6f8722c1dc1515799b461622777068` | GNU AGPLv3; README names a bare version, but root package.json has no licence field. No applicable precise version-scope declaration found. |
| IT Tools | `5732483fc24a6e6818839060bdf3cc7d9d324b9f` | GNU GPLv3; root package.json uses the non-SPDX phrase `GNU GPLv3`. README does not establish later-version scope. |
| Mini QR | v0.33.0 / `fe46504853c597e44b2e39d3decb5df2184c6605` | GNU GPLv3; root package.json has no licence field. README badge and root licence do not establish later-version scope. |
| RSSHub (internal) | `40aca9548e99eefd519ff7abbb937560fc037c95` | `AGPL-3.0-only`, normalized from the root npm licence declaration `AGPL-3.0`; root AGPLv3 text retained. |
| IMG.LY background removal component | `12f56cc4f2a90d624e165a715748d22efc7a1d93` / 1.7.0 | GNU AGPLv3; package refers to the included licence. Its generic appendix is not a project-specific later-version grant. Model/runtime notices remain separately preserved. |

Evidence: pinned local source under `/opt/utilibre/src`,
`/opt/utilibre/community-src` and `/opt/utilibre/expanded-src`; source grants were
searched outside dependency trees, lockfiles and generic licence appendices.
Private review extracts are in
`/opt/utilibre/reports/content-review-20261008/*license-evidence.txt` and
`*grant-evidence.txt`. The public provider ledger links exact upstream files;
Rallly additionally links the pinned README and BentoPDF its package manifest.

Remaining claim: the exact `-only` / `-or-later` scope for the human-labelled
entries, and PairDrop's conflicting package declaration. No upstream issue or
private inquiry has been sent as part of this audit. Clarification can replace
the human description later without changing functionality or removing source
offers. Existing explicit identifiers for other reviewed releases are retained;
this was a targeted audit of deprecated bare GNU identifiers, not a relicensing
exercise or a new audit of every transitive dependency.

## 9 October installed-revision follow-up

The earlier entries were checked again at their recorded pins, along
with the newly installed applications. The first follow-up confirmed:
**addy.io 1.7.3 is `AGPL-3.0-or-later`**, explicitly declared by the project's
[pinned composer.json](https://github.com/anonaddy/anonaddy/blob/150983e3331e80bb72b619984dc5e3f5390ddb93/composer.json#L8).
The separately distributed Docker recipe remains MIT. A bare version in the
README does not contradict this explicit project grant.

The other new entries have the following exact evidence. The identifiers below
are reviewed source commits, not mutable branch names. Root licence texts and
all existing notices are preserved without editing their legal wording.

| Application | Pinned source | Evidence and disposition |
| --- | --- | --- |
| Donetick | `e88d8bea62405ca02288f93dd70efab8c0f1ff2c` | Root `LICENSE.md` and README grant AGPLv3 without a project-specific later-version clause. Keep the human description. |
| Donetick frontend | `19c6a13dbfcfb7bc3110688554a45e29472a17b1` | Its own `LICENSE.md` and README say AGPLv3 without establishing version scope; root and e2e package.json have no licence field. |
| La Suite Projects | `455aa274b44e63efa42840997ea4924b43eed533` | `AGPL-3.0-only`, normalized from the root npm licence declaration `AGPL-3.0`; matching root licence and README preserved. Client/server manifests contain no conflicting licence field. |
| AutoRedact | `360fc18b976b9278b73d00e2c49e26c76de6557a` | `GPL-3.0-only`, normalized from the root npm licence declaration `GPL-3.0`, whose defined SPDX meaning is version 3 only; matching root GPLv3 text retained. |
| Gravity | `28e912b8f6808a4bf892fa0f1ffacf857b0faa3a` | Root GPLv3 conflicts with `package.json` saying ISC. Preserve the GPL text and human GPLv3 description; do not infer an alternative ISC grant. |
| Knit | `42be1d858273e2e1dad3c6b379a4219057b5176d` | Root GPLv3 conflicts with `package.json` saying ISC. Same unresolved scope and metadata contradiction as Gravity. |
| KitchenOwl | `09aaf5fbd2343fcc10b12e906c63c3764dd38919` | Root and backend AGPLv3 texts; README's project grant says bare `AGPL-3.0`. Backend pyproject.toml and Flutter pubspec.yaml have no licence field, so no formal SPDX declaration resolves the generic wording. |
| Opengist | `5afef9ac76d2d69ba11a888bb7a095b1d14e7c9d` | Root AGPLv3; README names bare `AGPL-3.0`. No supported suffix found. |
| ByteStash | `72adce8872414e4a11ea193d4374309f72b3990c` | Root GPLv3 conflicts with ISC in both `client/package.json` and `server/package.json`. Preserve GPL notices; no permissive dual-licence assumption. |
| OpenResume | `4f8255a2c763479837f69f1dccf2a3338730cd79` | Root AGPLv3 without an additional project-specific version-scope grant. |
| ChartDB | `c24936a402bb3e24b4858f05282d69a04fcfe25b` | Root AGPLv3 and README version-3 statement; root package.json has no licence field. No supported suffix found. |
| drawDB | `e4e696f2d2b1a17ac99ad1d062927582ff994a3c` | Root AGPLv3 without an additional project-specific version-scope grant. |
| SimpleLogin | `995904d5bc08ff5f951ad794b9372cbeb04d5fb6` | Root AGPLv3 conflicts with MIT in `pyproject.toml` and `static/package.json`. Keep the root grant and explicit scope uncertainty; do not describe the whole application as MIT. Private deployment restrictions remain unchanged. |

Tracked source was searched for SPDX declarations and project-specific
later-version grants, including package/composer manifests, README files and
source headers, without treating generated lockfiles, dependency copies or GNU
licence appendices as new project grants. The earlier PairDrop ISC conflict
remains. FreshRSS's later-version Minz headers still do not grant that scope to
the whole application. Mini QR's reviewed v0.33.0 tag resolves to
`fe46504853c597e44b2e39d3decb5df2184c6605`; the tag's exact resolution is also
recorded with the evidence.

Private, non-user-data evidence is in
`/opt/utilibre/reports/license-review-20261009/*.txt`. The remaining missing fact
is a clear project-author version-scope grant (and resolution of the five
metadata contradictions: PairDrop, Gravity, Knit, ByteStash and SimpleLogin).
No outside issue, email or licence clarification request was sent. This record
does not certify legal compliance or silently choose the more permissive text.

## 9 October primary-source closure check

The current upstream repositories were checked again when the owner requested
licence-fact corrections. All 29 reviewed repositories returned a current commit
through native Git. This includes the 24 catalog providers with a human GNU
label, Donetick's separately built frontend, internal RSSHub, IMG.LY's background
removal component, private SimpleLogin and already-resolved addy.io. The
installed pins above remain the authority for the deployed copies; a newer
branch does not silently change the grant on an older release.

Current author-published licence files and README statements did not add new
version-scope grants. The subsequent declared-metadata correction below resolves
four entries using already-present formal package declarations; it supersedes
the first review's blanket treatment of deprecated identifiers as uncertain.
Addy still explicitly declares `AGPL-3.0-or-later` in its
[pinned composer manifest](https://github.com/anonaddy/anonaddy/blob/150983e3331e80bb72b619984dc5e3f5390ddb93/composer.json#L8);
its root text remains [AGPLv3](https://github.com/anonaddy/anonaddy/blob/150983e3331e80bb72b619984dc5e3f5390ddb93/LICENSE.md).
No Addy grant is pending, and its separate Docker recipe remains MIT.

The catalog evidence was corrected without changing application licences:

- SearXNG's licence link referred to an older commit. It now points to the
  installed `6671d89bede8c9fc108b17bb98916170f5657650` revision and its explicit
  [AGPL-3.0-or-later source header](https://github.com/searxng/searxng/blob/6671d89bede8c9fc108b17bb98916170f5657650/searx/__init__.py#L1).
- FreshRSS and Mini QR source/licence links now use the immutable commits to
  which their installed release tags resolve. FreshRSS additionally links the
  [actual application manifest](https://github.com/FreshRSS/FreshRSS/blob/b2c50115baa36c217e939ee3ea8ecfae52f91abd/composer.json#L6),
  rather than implying that a library's grant covers the whole application.
- Donetick now links both the server licence and its separately pinned
  [frontend licence](https://github.com/donetick/frontend/blob/19c6a13dbfcfb7bc3110688554a45e29472a17b1/LICENSE.md).
- PairDrop, Gravity, Knit and ByteStash now expose their conflicting package
  declarations alongside the root licence in the existing evidence links.
  Nothing presents those conflicts as an alternative permissive grant.

The five metadata contradictions remain present in both the installed source
and the current author repository:

| Project | Conflicting installed author metadata | Missing clarification |
| --- | --- | --- |
| PairDrop | [Root package says ISC](https://github.com/schlagmichdoch/PairDrop/blob/4862ba3067be1a0f2e0d1e94861dc9200b5bfeea/package.json#L12); root licence is GPLv3. | Whether the package field is obsolete or applies to a distinct component, and the intended app-wide GNU version scope. |
| Gravity | [Root package says ISC](https://github.com/qunabu/Gravity/blob/28e912b8f6808a4bf892fa0f1ffacf857b0faa3a/package.json#L15); root licence is GPLv3. | Same scope clarification, attributable to the project copyright holders. |
| Knit | [Root package says ISC](https://github.com/alefore/knit/blob/42be1d858273e2e1dad3c6b379a4219057b5176d/package.json#L15); root licence is GPLv3. | Same scope clarification, attributable to the project copyright holders. |
| ByteStash | [Client](https://github.com/jordan-dalby/ByteStash/blob/72adce8872414e4a11ea193d4374309f72b3990c/client/package.json#L4) and [server](https://github.com/jordan-dalby/ByteStash/blob/72adce8872414e4a11ea193d4374309f72b3990c/server/package.json#L13) packages say ISC; root licence is GPLv3. | Whether either subproject has a distinct grant, and the version scope of the root grant. |
| SimpleLogin | [Python project](https://github.com/simple-login/app/blob/995904d5bc08ff5f951ad794b9372cbeb04d5fb6/pyproject.toml#L6) and [static package](https://github.com/simple-login/app/blob/995904d5bc08ff5f951ad794b9372cbeb04d5fb6/static/package.json#L13) say MIT; root licence is AGPLv3. | Whether those fields concern distinct components or stale metadata, and the root grant's version scope. Public security restrictions are independent and unchanged. |

For the entries still human-labelled in the earlier tables, the exact remaining
fact is the scope of the project-wide grant beyond the reviewed GNU version.
An applicable SPDX declaration, author licence
notice or attributable clarification covering the installed release would
resolve it. A distribution's label, GitHub's detected family, a dependency's
header, or the generic GNU appendix does not supply that missing fact. SPDX
itself distinguishes the [licence notice from the appendix example](https://spdx.org/licenses/GPL-3.0-only.html).

The review preserved all upstream notices and did not edit their legal text,
contact maintainers, install upgrades, disable services or broaden the FOSS
policy. No claim that the remaining suffixes are verified was published.

Evidence: `/opt/utilibre/reports/license-primary-20261009/heads.json`,
`files.json`, `forge-files.json` and the downloaded public source files. Current
Git heads were recorded separately from installed revisions. Codeberg's normal
raw source endpoints worked despite the browsing tool's restrictions; BreezeWiki
was checked from the existing exact checkout after its current Git head matched
the installed pin. It has no root `README.md`, so none is claimed as evidence.
Missing guessed root `LICENSE` paths for Addy/IMG.LY were resolved through their
actual `LICENSE.md` and component licence paths, not treated as absent licences.

## Declared-metadata correction, 9 October

The previous review incorrectly treated every deprecated GNU package identifier
as an unresolved fact. The [SPDX list](https://spdx.org/licenses/) states that
deprecated identifiers remain valid. Its [GNU identifier rationale](https://wiki.spdx.org/view/Legal_Team/only-operator-proposal)
describes the historical distinction across the GNU family: the unadorned SPDX
identifier denotes that version, while the `+` form permits later versions.
[npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#license) and
[Composer](https://getcomposer.org/doc/04-schema.md#license) define package
licence fields using these identifiers. This is different from assuming that
every casual phrase “GPLv3” is a precise SPDX declaration.

The following installed author declarations now use their current SPDX spelling
in Utilibre's inventory. No upstream notice, source file or licence grant was
changed:

| Application | Author declaration at the installed pin | Normalized inventory identifier |
| --- | --- | --- |
| AutoRedact | [package.json, line 18](https://github.com/karant-dev/AutoRedact/blob/360fc18b976b9278b73d00e2c49e26c76de6557a/package.json#L18): `GPL-3.0` | `GPL-3.0-only` |
| La Suite Projects | [package.json, line 10](https://github.com/suitenumerique/projects/blob/455aa274b44e63efa42840997ea4924b43eed533/package.json#L10): `AGPL-3.0` | `AGPL-3.0-only` |
| FreshRSS | [composer.json, line 6](https://github.com/FreshRSS/FreshRSS/blob/b2c50115baa36c217e939ee3ea8ecfae52f91abd/composer.json#L6): `AGPL-3.0`, also declared in root package.json | `AGPL-3.0-only` |
| RSSHub | [package.json, line 12](https://github.com/DIYgod/RSSHub/blob/40aca9548e99eefd519ff7abbb937560fc037c95/package.json#L12): `AGPL-3.0` | `AGPL-3.0-only` |

This records the declared package licence, not a conclusion that every bundled
file has identical terms. Applicable component grants and notices remain in the
source offers. The five ISC/MIT contradictions above were not normalized, and
the invalid npm phrase `GNU GPLv3` in IT Tools is not treated as an SPDX token.

Section 14 of GPLv3/AGPLv3 also matters: an applicable grant that specifies no
version permits a choice of published versions. The [FSF's explanation](https://www.fsf.org/bulletin/2024/spring/can-a-license-protect-against-future-threats-to-computer-user-freedom)
confirms that rule. It does not mean that every repository containing the v3
licence text has a versionless grant, nor does the sample appendix itself grant
later versions. The remaining labels describe a limit of this source review;
they do not assert that the software is unlicensed or nonfree. No author
clarification request or permission change was made.

The formal-field check covered every formerly human-labelled catalog provider,
not just the four corrections. It read files from the recorded Git commit,
excluding dependency trees and generated lockfiles. Exact file hashes and
absent-field results are retained in
`/opt/utilibre/reports/license-primary-20261009/installed-formal-declarations.json`.

| Remaining case | Precise reason it was not normalized |
| --- | --- |
| VERT, Mini QR, ChartDB, drawDB, OpenResume, Rimgo, DeGoog, SafeTwitch | Root package.json exists but contains no licence field. Root licence/README evidence remains as recorded above. |
| Opengist | Neither root nor docs/package.json declares a licence. The README's generic `AGPL-3.0` link remains distinct from a formal SPDX field. |
| Donetick frontend | Neither root nor e2e/package.json declares a licence. Its separate AGPLv3 text remains in the evidence links. |
| KitchenOwl | No licence field in backend/pyproject.toml or kitchenowl/pubspec.yaml; the README alone supplies the short version statement. |
| IT Tools | `GNU GPLv3` is the literal root npm field, not a defined SPDX identifier. |
| Kittygram | `description.license` in kittygram-dev-1.rockspec says `AGPL-3.0`. [LuaRocks defines that field as a short licence name](https://github.com/luarocks/luarocks/blob/main/docs/rockspec_format.md#package-metadata), including non-SPDX examples; it does not require SPDX semantics. No separate version-only/later notice was found. |
| Donetick server, Binternet, GotHub, Priviblur, BreezeWiki | No additional formal SPDX declaration found in applicable top-level package metadata. BreezeWiki's root and archiver/info.rkt contain no licence declaration. Their reviewed GNU texts remain available. |
| PairDrop, Gravity, Knit, ByteStash, SimpleLogin | Contradictory ISC/MIT package declarations remain; none was silently selected or rewritten. |
| IMG.LY background-removal component | The npm field explicitly refers to LICENSE.md rather than declaring a version-scope SPDX identifier. |

Absent metadata is not an absent licence. These remaining cases retain their
reviewed GNU family and source offer; an applicable clear notice or attributable
scope clarification would resolve the remaining inventory uncertainty.
