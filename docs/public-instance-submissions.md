# Public instance submissions, checked 9 October 2026

PrivateBin is listed. [Redlib PR117](https://github.com/redlib-org/redlib-instances/pull/117)
and [SearXNG request941](https://github.com/searxng/searx-instances/issues/941)
are existing requests, not claims of acceptance. On 6 October the SearXNG
maintainer explicitly started its two-week health and update observation period.
There is no unanswered request for operator action in that thread.

GitHub submissions completed on 8 October 2026 after the Galene load tests.
The earlier fine-grained token returned 403; a temporary operator-provided
classic token succeeded. Its local copy was removed after submission.
Submission is not acceptance.

| Service | Submitted request | Result checked 9 October |
| --- | --- | --- |
| AnonymousOverflow | [Review request](https://github.com/httpjamesm/AnonymousOverflow/pull/203) | Open; no review comments |
| degoog | [Accepted request](https://github.com/degoog-org/degoog/pull/347) | Merged, 9 October |
| Binternet | [Review request](https://github.com/Ahwxorg/Binternet/pull/68) | Open; no review comments |
| rss-bridge | [Accepted request](https://github.com/RSS-Bridge/rss-bridge/pull/5120) | Merged, 8 October |
| ntfy | [Review request](https://github.com/binwiederhier/ntfy/pull/2016) | Open; no review comments |
| priviblur | [Review request](https://github.com/syeopite/priviblur/pull/303) | Open; no review comments |
| BiblioReads | [Review request](https://github.com/nesaku/BiblioReads/issues/48) | Open; no review comments |

Codeberg access is needed for SafeTwitch, GotHub,
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
submission target. The generated `data.json` was fetched on 9 October and still
contains no Utilibre URL. The accepted degoog listing therefore does not yet
establish inclusion in LibRedirect. Its scheduled refresh is controlled upstream;
do not edit the generated file or send duplicate requests.
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
