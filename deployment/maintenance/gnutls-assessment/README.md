# GnuTLS certificate verification assessment, 12 October 2026

Both CVE-2026-88647 and CVE-2026-88648 remain open. This follow-up identifies
their exact residual behavior and adds isolated native regressions; it does not
install a TLS patch, replace a library, or exempt any scanner finding.

## Current primary evidence

- Debian still marks Bookworm `3.7.9-2+deb12u7`, Trixie
  `3.8.9-3+deb13u4` and unstable `3.8.13-1` unfixed for
  [88647](https://security-tracker.debian.org/tracker/CVE-2026-88647) and
  [88648](https://security-tracker.debian.org/tracker/CVE-2026-88648).
- [Debian bug 1150522](https://bugs.debian.org/1150522), filed 10 October,
  reproduces the cases in native Debian packages and reports them to upstream
  confidential work item 1965. The current tracker requests upstream assessment.
  The confidential report was not accessed, and no maintainer was contacted.
- Upstream's latest published tag returned by its API is `3.8.13`, commit
  `b390d80208ed60f1b33ad899475951a8efb40ccd`. Its reviewed hostname, constraint
  and chain-verification histories contain no subsequent repair of these
  cases. The four relevant files at current master commit
  `4e84948a5e89689edbab2c5920db7fc32f31a985` retain the malformed-SRV fallback,
  excluded-only unsupported-constraint helper and missing SRV enforcement.
  No compatible maintained correction was identified in this review.
- The [upstream April advisory](https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-7)
  fixes issue 1802 as CVE-2026-42012. **That does not clear 88647.** The newer
  report describes a malformed SRV `otherName`, whose value is an OCTET STRING
  rather than an IA5String. Failed decoding leaves the generic name type, which
  bypasses the earlier Common Name suppression. Both the published source and
  our native tests confirm this distinction.

The researcher fixtures are pinned to public commit
`4420fd7dca9944f17db2e01c46183a7f73b70949` in
[`lkloliver/poc`](https://github.com/lkloliver/poc/tree/4420fd7dca9944f17db2e01c46183a7f73b70949).
`fixtures.json` fixes the hashes of the fifteen synthetic PEM/key files. No
downloaded reproduction script is executed, no `/etc/hosts` entry is added,
and these public fictional keys are not production credentials.

## Installed native results

The current queue contains twenty records for each CVE. It covers eight
Bookworm images, ten ordinary Trixie images plus the host, and one Trixie DHI
image. One immutable existing image per distinct package variant was tested;
this is not a fresh full-fleet check or proof of every application's exposure.

| Package variant | Isolated representative | Result |
| --- | --- | --- |
| `3.7.9-2+deb12u7` | Wishlist's current mount-security image | All reported cases reproduced; normal acceptance/rejection controls passed. |
| `3.8.9-3+deb13u4` | Priviblur's current archive-tar image | Same results. The host separately has this package version; no fixture was sent to a live service. |
| `3.8.9-3+deb13u4+dhi2` | Penpot exporter's current single-screen image | Same results; the vendor suffix does not remove these behaviors. |

Each native run uses the image's actual `libgnutls.so.30`, rather than replacing
it with a test library. Exact immutable images and runtime-library SHA-256 values
are in the private `image-specs.json` receipt.

| Case | Installed behavior | Required correction / control |
| --- | --- | --- |
| Malformed SRV SAN plus matching CN | Accepted by hostname checking and TLS 1.2/1.3; exact fictional bytes exchanged | Reject the malformed identity. This is 88647, despite the retained 42012 fix. |
| Well-formed SRV SAN plus matching CN | Rejected, including TLS 1.2/1.3 | Preserve the earlier 42012 repair. |
| Ordinary CN mismatch / match | Mismatch rejected; matching legacy CN accepted, including TLS 1.2/1.3 | Preserve valid existing behavior unless upstream deliberately changes that contract. |
| Leaf outside a permitted directoryName subtree | Chain accepted | Enforce the permitted constraint (88648). |
| Leaf matching an excluded SRV otherName | Chain accepted | Enforce the constraint or reject unsupported critical constraints safely (88648). |
| Leaf outside an excluded directoryName subtree | Chain rejected | Avoid the existing blanket rejection of legitimate names (88648). |

The three images yielded **45 native observations**, including **24 TLS
handshakes** over private Unix socket pairs. Successful handshakes exchanged and
compared an exact fictional payload. Negative TLS controls failed specifically
on certificate verification, not transport failure. Native OpenSSL 3.5.7
separately rejects the first two constraint-bypass fixtures and accepts the
legitimate excluded-directoryName control. These controls check the fictional
fixtures; OpenSSL is not substituted into any service.

The future `--expect fixed` gate was also run against an unfixed Trixie control
and correctly returned status 2. It cannot mistake a successfully reproduced
vulnerability for a repaired library.

The harness runs non-root, read-only, with no network, capabilities or production
mounts, at one CPU/192 MiB and a bounded process/time limit. No image is rebuilt,
no user data or service setting changes, and no scanner disposition is written.

## Reproduction and future patch gate

Private evidence is under
`/opt/utilibre/reports/gnutls-review-20261012/`: primary API/report snapshots,
`debian/manifest.json`, exact image/library hashes, `native-baseline.json`,
three original native transcripts, `openssl-controls.json`,
`upstream-current.json` and `unfixed-negative-gate.json`.

The existing authenticated Debian source/package indexes supply the unmodified
source and headers without installing them:

```sh
apt-get source --download-only gnutls28=3.8.9-3+deb13u4
apt-get download libgnutls28-dev=3.8.9-3+deb13u4
dpkg-source -x gnutls28_3.8.9-3+deb13u4.dsc source
dpkg-deb -x libgnutls28-dev_3.8.9-3+deb13u4_amd64.deb headers
```

Run in a private evidence directory with at least 8 GiB remaining on the root
filesystem. Retain the source/package hash manifest; do not overwrite a prior
receipt. The installed Debian source includes the 42012/42013 and other vendor
backports and must remain the base of any later candidate.

```sh
python3 deployment/maintenance/gnutls-assessment/check.py \
  --headers /private/evidence/headers/usr/include \
  --fixtures /private/evidence/fixtures \
  --images /private/evidence/image-specs.json \
  --output /private/evidence/new-baseline.json --expect baseline
```

The image-specification file is a JSON array with exact `image` SHA-256 IDs and
`version` strings, as in the private receipt. The script downloads only missing
pinned fixtures, validates their hashes, compiles our small wrapper against the
native GnuTLS API, then invokes it in disposable containers. **A successful
baseline run confirms defects; it is not a successful security gate.**

For an assessed future candidate, supply its immutable image ID and use
`--expect fixed`. It must reject both bypasses while preserving the positive
and negative controls. That gate is necessary but not sufficient: review the
maintainer patch, retain prior fixes, compare ABI/exported symbols and unrelated
payloads, run the upstream certificate/TLS suites and affected application
regressions before any scoped release. Record the candidate's failure rather
than weakening a control to make it pass.

## Exact remaining blocker

A maintained correction and its compatibility assessment are still missing.
The public recommendation for 88647 is not an accepted backportable changeset;
changing an otherName type/error contract can affect more than hostname checks.
88648 additionally needs correct distinguished-name subtree handling and
enforcement of supported/unsupported critical constraint types. Simply rejecting
all such certificates would preserve its false-rejection defect and can break
valid private PKIs. A blanket macro change, relabelling the existing 42012 fix,
or swapping libraries without this behavior being repaired is not completion.

Both findings remain visible with no waiver, no live patch and no new exposure
claim. Revisit this exact source/fixture gate when upstream or the installed
branch's vendor publishes a compatible correction.
