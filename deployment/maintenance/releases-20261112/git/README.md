# Git vendor updates — 12 November 2026

Opengist's Git-only update was released on 12 November 2026 at 04:12 UTC through
the existing locked release process. Only its application container was
recreated. The gateway did not need a reload or recreation. No host package,
application configuration, secret, data mount, retention or network policy was
changed. The exact Git source archive and its link in the existing source index
were published. No other service was activated.

`status.json` is the immutable, hashed preparation snapshot; its
`productionChanged: false` describes preparation, not the subsequent release.
`release-status.json` records the completed activation. Detailed private evidence
is `/var/lib/utilibre-maintenance/git-vendor-20261112/release.json`.

The fresh queue contains 33 high package/advisory/target records for three Git
advisories across the host and five images. These are not 33 distinct CVEs.

| Target | Current package | Candidate/readiness |
| --- | --- | --- |
| Opengist | Alpine `git`, `git-init-template` 2.54.1-r0 | Signed vendor overlay deployed; isolated gates and live health pass |
| Host | Debian `git`, `git-man` 1:2.47.3-0+deb13u1 | No newer fixed package in authenticated trixie, security or updates indexes |
| RSSHub | Same Debian packages | Same vendor prerequisite |
| Priviblur | Same Debian packages | Same vendor prerequisite |
| BreezeWiki | Same Debian packages | Same vendor prerequisite |
| Penpot exporter | DHI `git` 1:2.47.3-0+deb13u1+dhi2 | Authenticated DHI index still offers the installed version |

The deployed Opengist image removes six of those high package-target records
against the same frozen advisory data. The other 27 remain open.
No finding was suppressed, accepted automatically, or marked fixed in the live
queue. Upstream Git has published fixes, so “no distro package” does not mean
there is no upstream correction. A separately reviewed Debian backport/build
would require its own exact source, packaging and host/application checks; this
candidate does not replace system Git with an unregistered binary or mix suites.

## Verified Opengist image

- Before: `sha256:5d719639e41ddaefc3c5e1ffc5103b25dd7bb127b89ba78a64762960ac5d9532`
- Deployed: `sha256:8733803eb5bf9ddc7044016ab92f9725107b615c13e05e4057f4ab1646af5414`
- Local reference: `utilibre-opengist:git-vendor-20261112`
- Native application and Go binary remain unchanged; this is only a Git package update.

Both APK files were verified with the existing image's Alpine signing keys.
Package checksums and the exact base are locked in `inputs.json`. The build
reuses the existing signed-APK overlay procedure. The retained
`security-20261109/zlib-check.py` full-image exporter verifies file contents,
types, ownership, permissions and links before/after. Eight Git-owned/metadata
paths change; unrelated files, APK records, image configuration, musl and all
previous application repairs remain unchanged. Git package constraints in APK's
world file become exact content pins. No dependency resolution or downloads
occur during the build.

Ordinary synthetic checks passed on both images: init, commits, branch/merge,
tag, archive, bare clone, push/reopen, fast-export/import and repository integrity.
The existing Opengist test then passed on both images: two native accounts,
private/public access, edits and commit history, ZIP download, private HTTP Git
clone/push/reopen, and native account/gist deletion. Data lives in RAM, accounts
are fictional, and the application test network has no external connectivity.
Production OIDC, live user data and real browsers were not exercised here.
No exploit or vulnerability-reproduction fixture was run.

Frozen Trivy 0.76.2 used the same database, updated
`2026-11-12T01:03:48Z`, for both images:

| Image | Critical | High | Medium | Unknown |
| --- | ---: | ---: | ---: | ---: |
| Before | 0 | 6 | 7 | 4 |
| Candidate | 0 | 0 | 3 | 2 |

The unchanged remaining findings stay visible in the private reports. No new
finding was introduced. These results establish package-version assessment and
tested compatibility, not exploitability or universal application security.

## Repeat and release

`prepare-opengist.py` is a narrow preparation adapter, not a deployment script.
It requires the pinned base and already downloaded, signature-verified APKs in
the private evidence directory. It refuses changed input checksums, a different
running base, insufficient free space, unrelated package/file changes, or an
existing successful result. It uses one CPU, 256 MiB for the isolated package
build/native fixture and the existing full-image comparison. The retained
Opengist workflow check uses one CPU and 512 MiB.

```sh
python3 deployment/maintenance/releases-20261112/git/prepare-opengist.py
python3 deployment/maintenance/go-leaf-final/check-opengist.py --image-id sha256:8733803eb5bf9ddc7044016ab92f9725107b615c13e05e4057f4ab1646af5414 --output /absolute/private/new-report.json
```

Do not overwrite the existing evidence to repeat a build. Preserve it, review
any changed baseline, then explicitly create a new evidence generation through
the existing maintenance process. A future release must recheck the live image
and configuration hashes, the exact candidate, report/checker hashes and fresh
security evidence. `release-opengist.mjs --check` implements those gates without
activation; `--apply` additionally requires the reviewed `release-policy.json`
and acquires the existing package-release lock. Both refuse baseline drift,
including a replay after this successful deployment. They do not silently
refresh advisory data. The policy permits at most 24-hour-old evidence and
advisory data and retains all medium/unknown findings explicitly.

The adapter publishes the exact source offer through `publishSourceIndex`,
replaces one Compose image scalar, validates all other rendered Compose fields,
and uses `releaseGroup` for scoped activation and automatic rollback on a failed
gate. The live image, Git version, mounts, configuration hashes, private gateway
health and public HTTPS health passed. Only Opengist's container ID changed.
The gateway and all other running containers retained their IDs and images.
No public write, login, private data or provider integration was tested live.

The previous image remains available as
`utilibre-opengist:xnet-security-20261109`; the exact prior Compose file is kept
privately as `compose.opengist.before.yaml` beside the release evidence. For a
later authorized rollback, first check that the current Compose checksum equals
`release-status.json`'s checksum and the current container uses the deployed
image above. Through the existing package-release lock/process, replace only
the `opengist` image scalar with that predecessor and recreate only `opengist`
using Compose `--no-deps --no-build --pull never`. Recheck its native health,
Git 2.54.0 and the private/public gateway health. Reload the same gateway only if
a healthy recreated app has a changed address and the gateway returns 502–504.
Do not overwrite subsequent configuration changes. This package-only change
has no database migration; image rollback retains account data. It restores the
old Git vulnerabilities too. Keep the published corresponding source available.

Corresponding GPL-2.0-only Git source, exact Alpine `APKBUILD` and its auxiliary
inputs have been acquired and checked against the packaging revision's SHA-512
values. The source archive is published at
[the existing source route](https://tools.utilibre.org/utilibre-source/git-2.54.1-alpine-source.tar.gz).
Its SHA-256 is
`dfc1416f1bd3b0198465eef2298e617dd6f96ec2c1adc42416ce960dcdd9c84a`.
The existing Opengist source offers remain necessary for its unchanged local
application fixes.

Machine-readable `status.json` and private evidence paths bind all results. The
private acquisition receipt authenticates Debian/DHI InRelease signatures and
index SHA-256 chains; it records exact unavailable vendor versions without
modifying host APT state. No scanner database was refreshed by this work.

Primary sources inspected 12 November 2026:
[Git release guidance](https://github.blog/open-source/git/git-security-vulnerabilities-announced-7/),
[Debian 105437](https://security-tracker.debian.org/tracker/CVE-2026-105437),
[Debian 111760](https://security-tracker.debian.org/tracker/CVE-2026-111760),
[Debian 114466](https://security-tracker.debian.org/tracker/CVE-2026-114466),
[Alpine security records](https://secdb.alpinelinux.org/v3.24/main.json),
[exact Alpine package source](https://gitlab.alpinelinux.org/alpine/aports/-/blob/e1bb2d7fd69b2bbed321077da3085b8195abef69/main/git/APKBUILD).
