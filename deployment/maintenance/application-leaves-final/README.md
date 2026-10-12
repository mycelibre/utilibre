# Final application-dependency repairs — 12 October 2026

These are narrow local repairs, not claims that a disputed advisory is harmless.
Private proof/rollback artifacts are under
`/var/lib/utilibre-maintenance/application-leaves-final-20261012/`.
No user data, credentials, content logs or additional public service were added.

| Component | Exact repair | State at this checkpoint |
| --- | --- | --- |
| Chitchatter WebSocket tracker | MIT bittorrent-tracker 11.2.3-utilibre.1; remove node-ip 2.0.1 and use the already installed ipaddr.js 2.5.0 for its IPv4 decoder | Released 2026-10-12 17:50:09 UTC; exact image `1c8690b1e3d5ce18a19cab1f03218c63db11d21a977fcdbfce21c0ec1ab633f8` |
| KitchenOwl NLTK | Five-module upstream model-path backport; retain installed version 3.10.3 and all other application/runtime files | Released 2026-10-12 17:56:55 UTC; exact image `7dac8811c08ac295bab6b658f3af27ee79d4d75864d7fa5cec3253a561d3837c` |
| CryptPad braces | MIT 3.0.3-utilibre.1 derivative; supported AST depth 256, parser and every recursive walker guarded; native npm local override | Released 2026-10-12 18:04:45 UTC; mounted source changed, existing runtime image retained |

Later registered native overlays may change an image ID while preserving these
bytes. The review generators follow only completed same-role overlay receipts
and recheck the actual repaired files. A version string, old review or ancestry
alone is insufficient.

## Tracker: remove the dependency, preserve signaling

`tracker-prepare.mjs` authenticates the npm tarball's pinned SHA-512 integrity,
retains the upstream MIT source/notices and makes a two-line decoder adaptation.
The original tracker 11.2.3 is not relabeled as an upstream fix. The local package
and every unchanged lock entry are retained in `deployment/chitchatter/`.
`Dockerfile.tracker` copies the small vendor archive before the existing install.

The isolated candidate physically removes `/app/node_modules/ip`, including the
installed lock entry. Native tests verify five IPv4 cases, three invalid packets,
two real WebSocket peers' announce/offer signaling, wrong-origin rejection and
continued absence of UDP listeners. Existing source/configuration restrictions
(WebSocket only, no HTTP/statistics endpoint, no trusted proxy) remain intact.
This is not a claim that browser video or a complete file transfer was retested.

The original decoder's integer argument was itself incompatible with node-ip;
the compatibility check therefore uses the required IPv4 wire bytes, not an
assertion that this old defective branch's output was correct. UDP remains off.
The vulnerable address-classification API is no longer installed, rather than
merely described as unused. A fresh scan should remove that dependency finding;
there is no blanket node-ip review exemption.

## NLTK: preserve the previously hardened baseline

Advisory: [GHSA-8mgp-746c-j5xp](https://github.com/nltk/nltk/security/advisories/GHSA-8mgp-746c-j5xp),
CVE-2026-81726. `nltk-acquire.mjs` pins immutable upstream commits and records
their downloaded hashes (not a claim of a verified Git signature):

- `2a92b71827d754ae8920261e7ed0c4bb283ab2d7`: Maxent model output.
- `a44a7af69bca87e92d9c4a701fcbbe4512e8d450`: transition parser file access.
- `cbc98458b43de5f792f0382583c16df39e5c5117`: perceptron validation/private staging.

`nltk-backport.py` mechanically replaces only affected functions and adds exact
upstream helper definitions. Existing path restrictions and pickle allowlists
are not overwritten. Five `.py` modules and corresponding compiled bytecode
change; all other `/opt/venv` and KitchenOwl application files retain their bytes,
ownership and modes. The upstream package still reports 3.10.3: mitigation is
bound to exact bytes, never inferred from that version string.

The isolated baseline allowed outside-root access through each of the six named
public APIs; the candidate rejects all six without widening the allowed roots.
Native tests exercise SVC training/parsing, perceptron training/save/reload,
Maxent model round-trip, private directory permissions, path/name validation,
symlink/hardlink/FIFO refusal and installed ingredient-parser models. The existing
KitchenOwl fixture verifies two account/household boundaries, recipe
import/export/restore/deletion and denied cross-account access in temporary data.
No models are downloaded and no actual account data is used. This is targeted
native coverage, not a claim that the entire NLTK test suite ran.

## Braces: bounded recursion, with native consumers preserved

Source: [upstream issue 70](https://github.com/micromatch/braces/issues/70),
CVE-2026-93687, pinned upstream 3.0.3 commit
`74b2db2938fad48a2ea54a9c8bf27a37a62c350d`. There was no upstream fixed release
at inspection. The disagreement over the advisory is not used as a waiver.

`braces-prepare.mjs` changes five small library files. The original 10,000-character
limit remains; parser nesting and direct AST recursion additionally have depth
256 guards. Beyond that supported depth, the library throws `SyntaxError`.
This deliberate compatibility boundary prevents uncontrolled stack exhaustion;
it does not promise arbitrarily deep patterns or arbitrary resource safety.

Verification on the deployed Node 24 runtime:

- All 764 upstream tests in 49 suites passed; no skipped/failed tests.
- A bounded depth-20,000 direct AST reproduced the old stack overflow. This is
  not misrepresented as reproducing the advisory's Node 26 string threshold.
- Nineteen hostile strings/ASTs are rejected, 30 ordinary old/new results match,
  and actual installed micromatch/fast-glob consumers produce their expected files.
- The existing complete CryptPad fixture runs two separate accounts through
  native registration, document save/reopen, uploads, teams/invitations, key
  backup versus content export, HTML/ZIP output and independent import/reopen.
  Its original source pin/assertions remain; only disposable paths, candidate
  dependency bind and the exact already repaired image identity are adapted.

All fixture state is synthetic/tmpfs and removed afterward. No actual pad state
was inspected. Only the five library modules, derivative metadata, package/lock
records and local tarball are installed. The new local override makes a native
future install select the derivative rather than silently refetching 3.0.3.
`lock-check.mjs` verifies the complete tracker and CryptPad locks round-trip
unchanged using native npm, offline, no lifecycle scripts or package install,
in a bounded 64 MiB tmpfs. This is not a full from-scratch CryptPad build.

## Release, review and rollback

Root owns serialized activation. Each helper supports `prepare` and `apply`;
preparation is read-only to production and expires after an hour. Exact previous
images, configuration, proof-file hashes, candidate files and public source
hashes must match. The recovery floor is 8 GiB. Image-only changes preserve
gateways, all non-image configuration and user data. CryptPad's image is unchanged;
its helper atomically installs only the listed mounted-code files, preserves
modes/ownership and recreates only CryptPad. An unrelated image/config change
invalidates preparation instead of being overwritten.

```sh
node deployment/maintenance/application-leaves-final/braces-release.mjs prepare
node deployment/maintenance/application-leaves-final/braces-release.mjs apply
node --test deployment/maintenance/application-leaves-final/*policy.test.mjs
```

Do not replay preparation/application for an already completed receipt. Failed
application automatically restores the retained exact old image/pins or listed
old code/lock bytes and verifies its rollback. It never restores over current
documents, removes a whole source directory or resets account data. A later
manual rollback must preserve and reverse subsequent overlays in order; restoring
an old image blindly would discard other security repairs.

After the normal global scanner has completed a new scan, root may run
`nltk-review.mjs` and `braces-review.mjs`. They generate only exact seven-day
`mitigated` decisions for these two CVEs and require completed live release,
unchanged candidate evidence, fresh scanner identity, exact patched byte hashes
and registered completed image ancestry. The pure policy tests reject other
versions, roles, packages, CVEs and scopes. Neither script changes the ledger.

Existing generic update helpers refuse unreviewed image swaps/rebuilds. These
services remain review-only, not auto-updated. A direct administrator command
can still bypass that guard; the local override is not a security boundary.
CryptPad mounted-source updates additionally require preserving this override
or explicitly retiring it after upstream validation. Before an update:

1. Select the exact new upstream release and inspect its relevant fix/source.
2. Stage on the current complete patched lineage; replay only still-needed
   repairs, preserving all unrelated fixes and supported service settings.
3. Run the native regressions, application checks, byte-preservation checks and
   fresh scan before guarded release.
4. Retire a local patch only after the upstream source and the same negative/
   ordinary tests establish the fix. Remove its derivative/override and update
   the review policy/source offer deliberately; do not bless a higher version.

## Corresponding source

All three archives include complete original/modified dependency source,
licenses/notices and build/verification recipes, not private configurations.
Their complete HTTPS responses and SHA-256 were checked on 12 October 2026.
All three source archives and both npm vendor archives were regenerated into
memory from the retained trees and exactly matched their published hashes.
The main source index is maintained by the root release, not this helper.

| Archive | Bytes | SHA-256 |
| --- | ---: | --- |
| [Tracker](https://tools.utilibre.org/utilibre-source/security-tracker-ip-20261012-source.tar.gz) | 79,848 | `b89379371c520b5aa6967860f6ff750d4dd041bc73802446ce3f2d18526dd0ee` |
| [NLTK](https://tools.utilibre.org/utilibre-source/security-nltk-model-paths-20261012-source.tar.gz) | 252,786 | `e875c165dd705b434207cc3eb7821b9e65df9f51f35f401e3d065a15fe7868c6` |
| [Braces](https://tools.utilibre.org/utilibre-source/security-braces-depth-20261012-source.tar.gz) | 375,912 | `d0c01098df9a612d6cf2f8849531faeba7dd09f593274c058e3de4a9d3dcb571` |

### Retained braces 3.0.3 correction (12 October, final scan)

The final scan additionally matched CVE-2024-4068 against our
`3.0.3-utilibre.1` suffix: native semver orders that prerelease spelling below
`3.0.3`. No installed version or byte was changed to remove the finding.
`braces-retained.mjs` proves the retained upstream fix separately from the newer
depth mitigation and `braces-review.mjs` produces a narrowly keyed draft.

Use the final released [PR #40](https://github.com/micromatch/braces/pull/40)
correction, commit `415d660c3002d1ab7e63dbf490c9851da80596ff`: the 10,000-character
limit and parser check/clamp. The earlier `9f5b4cf` proposal cited by Debian's
tracker was reverted; it must not be claimed present or used as reverse proof.
The [reviewed advisory](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) identifies
3.0.3 as fixed. Primary sources were rechecked on 12 October 2026.

Removing only our previously reviewed depth additions reproduces the original
parser/constants from pinned upstream `74b2db2938fad48a2ea54a9c8bf27a37a62c350d`
byte-for-byte; the constants also match the final correction commit. Exact live
module/lock hashes and completed image ancestry remain required. In a read-only,
network-isolated 128 MiB container with a 64 MiB Node heap, six oversized-input
boundary tests were rejected, while 10,000 characters, a smaller configured
limit, ordinary expansion, micromatch and the newer depth guard behaved correctly.
Existing 764 upstream tests and two-account application evidence are reused,
not represented as rerun. This is not an unrestricted-input memory-load test.

Private evidence is `braces/retained-4068.json`; immutable upstream patch/raw files
are under `braces/retained-4068/` with digest pins in the proof script. Run:

```sh
node deployment/maintenance/application-leaves-final/braces-retained.mjs
node deployment/maintenance/application-leaves-final/braces-review.mjs
```

The first command uses the existing image and mounted dependencies read-only;
the second prepares decisions only. CVE-2026-93687 keeps its separate existing
mitigation. No deployment, runtime change, version laundering or ledger write
occurred during this attribution.
