# Public instance submissions, checked 10 October 2026

PrivateBin is listed. [Redlib PR117](https://github.com/redlib-org/redlib-instances/pull/117)
and [SearXNG request941](https://github.com/searxng/searx-instances/issues/941)
are existing requests, not claims of acceptance. On 6 October the SearXNG
maintainer explicitly started its two-week health and update observation period.
There is no unanswered request for operator action in that thread.

GitHub submissions completed on 8 October 2026 after the Galene load tests.
The earlier fine-grained token returned 403; a temporary operator-provided
classic token succeeded. Its local copy was removed after submission.
Submission is not acceptance.

| Service | Submitted request | Result checked 10 October |
| --- | --- | --- |
| AnonymousOverflow | [Review request](https://github.com/httpjamesm/AnonymousOverflow/pull/203) | Open; no review comments |
| degoog | [Accepted request](https://github.com/degoog-org/degoog/pull/347) | Merged, 9 October |
| Binternet | [Review request](https://github.com/Ahwxorg/Binternet/pull/68) | Open; no review comments |
| rss-bridge | [Accepted request](https://github.com/RSS-Bridge/rss-bridge/pull/5120) | Merged, 8 October |
| ntfy | [Accepted request](https://github.com/binwiederhier/ntfy/pull/2016) | Merged, 9 October, 20:39 UTC |
| priviblur | [Review request](https://github.com/syeopite/priviblur/pull/303) | Open; no review comments |
| BiblioReads | [Accepted request](https://github.com/nesaku/BiblioReads/issues/48) | Maintainer confirmed addition, 10 October, 04:52 UTC; URL verified in upstream instances.json |

Authenticated Codeberg write access is needed for SafeTwitch, GotHub,
Kittygram and TransLite; Gitfield access is needed for Mezzo. 4get uses distributed
operator-maintained lists rather than a central acceptance workflow. FMD's
alternative-implementations page is not a directory of public hosted instances.

LRCLIB's official frontend now replaces Dumb at `lyrics.utilibre.org`.
No official instance directory was found in the reviewed frontend/server
repositories. This deployment is a read-only client of the public LRCLIB API,
not an independent LRCLIB database mirror; do not submit it as one.

Do not submit incomplete workflows as healthy: Rimgo playback and BreezeWiki
images still encounter upstream refusals. BreezeWiki tabs are repaired. LibreMDB
private search and images pass, but its selected IMDb endpoint excludes public
use; no permission covering Utilibre has been verified. See
`frontend-reliability-2026-10-09.md`. Mumble is
password-protected with verified public TCP voice and inbound UDP routing;
it is not an open server. A single authenticated encrypted UDP audio loopback
also passed from an external runner on 9 October; see
`mumble-udp-verification-2026-10-09.md`.

## LibRedirect and Awesome Selfhosted

LibRedirect consumes upstream instance lists; its generated data is not the
submission target. The generated `data.json` fetched on 10 October contains
`https://degoog.utilibre.org` and `https://biblioreads.utilibre.org`. This
supersedes the 9 October observation of no Utilibre entries. It establishes
inclusion in generated data, not deployment to every extension installation.
Its scheduled refresh is controlled upstream; do not edit the generated file
or send duplicate requests.
Evidence: `/opt/utilibre/reports/queue-completion-20261009/submissions.json` and
`libredirect.json`; source: https://github.com/libredirect/instances .

Awesome Selfhosted has not received a Utilibre submission. It catalogs
installable software, not a directory of our hosted instances. Assess the
portal software separately against its first-release age and scope criteria.
On 9 October the API still showed no published releases; the repository was created
3 September 2026. A first release more than four months old is required, so
repository age alone does not meet the eligibility checklist.
Its current contribution rules prohibit machine/LLM-generated contributions;
any submission there must be prepared and sent by the operator personally.
See https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/CONTRIBUTING.md .

For public upstream GitHub submissions, classic PAT scope `public_repo` was
sufficient; no private repository, workflow, or admin scope was needed. This
does not authenticate Codeberg or Gitfield. Never store tokens in this repository.

## Remaining directory actions, 10 October

Public GET access to Codeberg and Gitfield works; authenticated write access is
the missing capability, not an inaccessible website. No retained login/token
for either host was found. The native contribution destinations were checked:

- [SafeTwitch](https://codeberg.org/SafeTwitch/safetwitch): README requests an
  issue or PR adding the instance to its table. Destination: `https://twitch.utilibre.org`.
- [GotHub](https://codeberg.org/gothub/gothub-instances/src/branch/master/instances.json):
  native JSON contains country, URL, Tor/Cloudflare/provider, branch and runtime
  versions. Destination: `https://gothub.utilibre.org`. Current public version
  endpoint reports Fiber 2.52.15 / Go 1.26.8 but an unknown source version;
  derive the actual revision from the reviewed build, not a guessed API value.
- [Kittygram](https://codeberg.org/irelephant/kittygram/src/branch/main/instances.json):
  native URL/country/alternate-network fields. Destination: `https://gram.utilibre.org`.
- [TransLite](https://codeberg.org/gospodin/translite/src/branch/master/instances.json):
  native provider/location/Cloudflare fields. Destination: `https://translate.utilibre.org`.
- [Mezzo](https://gitfield.org/fsky/mezzo-instances): submit an issue with
  `https://tenor.utilibre.org`, disclose Cloudflare where enabled, and satisfy
  the documented maintenance/no-analytics/source-publication conditions. Its
  list is not an unrestricted API submission endpoint.

None of these five lists contains the Utilibre URL in the checked revision.
Before submitting, rerun the relevant native journey and verify provider/proxy
fields; a working landing page is insufficient. Do not create duplicate accounts,
send maintainer messages, or claim a submission without authenticated confirmation.

PrivateBin remains listed. At the 10 October follow-up its directory still shows
uploads disabled, while Utilibre's public HTML exposes the native attachment
marker and the 25 MB workflow has passed. This is an upstream refresh dependency,
not a reason to resubmit or alter the directory's data. See
[PrivateBin verification](privatebin-uploads-2026-10-10.md#directory-refresh-external).
