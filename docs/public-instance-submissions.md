# Public instance submissions, checked 12 October 2026

## Read-only follow-up, 12 October at 20:20 UTC

Two earlier waiting items have resolved:

- [GotHub PR222](https://codeberg.org/gothub/gothub/pulls/222) merged on
  11 October at **16:56:59 UTC**. The upstream `dev` README now lists
  `gothub.utilibre.org`, Germany, Hetzner and Cloudflare. This closes the
  submission/acceptance task. Its separately generated `gothub-instances` JSON
  has not yet included the entry; do not treat that lag as a rejected request
  or submit it again.
- [PrivateBin's directory](https://privatebin.info/directory/) now shows
  **file upload enabled** and **Observatory A+** for `paste.utilibre.org`.
  The public instance still exposes both the native attachment marker and
  `js/privatebin.js?2.0.6` version pattern. This closes the directory-refresh
  item after the 11 October detector compatibility repair. No new paste,
  directory submission or forced scan was needed. The directory's country
  flag and uptime percentage are its observations, not evidence of Utilibre's
  origin location or a measured availability commitment.

The five GitHub requests remain open: Redlib #117, SearXNG #941,
AnonymousOverflow #203, Binternet #68 and Priviblur #303. Their update times,
comment counts and returned review-comment counts show no new requested
changes since the preceding follow-up. Kittygram PR100 remains approved but
unmerged; TransLite PR31 remains open without reviews. These seven requests
are waiting for upstream decisions, not unfinished submissions.

SearXNG has a separate eligibility issue: the 12 October provider check
verified that `search.utilibre.org` now uses Cloudflare's HTTP proxy, while
the instance directory requires DNS-only use. Its open request and the
previous observation period do not establish current eligibility. No DNS,
proxy setting or claim in the external request was changed during this check.
The provider decision remains pending; see the current checkpoint in
[the work queue](work-queue.md).

LibRedirect's current generated JSON contains the Utilibre degoog and
BiblioReads URLs. GotHub is not there yet. This verifies generated-list
inclusion only, not receipt by every browser-extension installation.
SafeTwitch's repository still reports `archived: true`; its draft is not
eligible for submission there. Mezzo still requires access to its official
Gitfield destination. Awesome Selfhosted's eligibility and human-contribution
conditions below remain respected.

Bing's authenticated read-only API still reports verified ownership and
sitemap `Success`, **168 URLs**, last crawled **10 October at 15:58:21 UTC**.
The live sitemap now serves **196 URLs**. Those API values are an older crawl,
not evidence that all current pages have been indexed or that 28 pages failed.
No unchanged sitemap, IndexNow notification, diagnostic fetch, maintainer
message or new submission was sent. Ranking and indexing outcomes remain
unestablished.

Filtered receipts, without credentials or unrelated account records:
`/var/lib/utilibre-maintenance/listings-followthrough-20261012/read-only-status.json`
and `gothub-upstream.json` in the same directory. Public source checks used the
[GotHub README](https://codeberg.org/gothub/gothub/src/branch/dev/README.md),
[generated GotHub list](https://codeberg.org/gothub/gothub-instances/src/branch/master/instances.json)
and [LibRedirect JSON](https://raw.githubusercontent.com/libredirect/instances/main/data.json).

## Historical maintenance follow-up, 11 October at 10:33 UTC

The five pending GitHub requests below and all three Codeberg requests remain
open. Kittygram PR100 now has an approving review from `koru` (07:25 UTC) and
a comment accepting the server-side changes; it is **not merged/listed yet**.
The public PR page was readable even though the token lacks issue-comment scope.
No response is requested. No maintainer message, duplicate submission or PR
mutation was made. Filtered API receipt:
`/opt/utilibre/reports/maintenance-20261011/visibility.json`.

PrivateBin's directory still marks file upload disabled. Its public instance
has uploads enabled; the previously established scanner-refresh dependency
below remains. Do not label the requested green check complete or resubmit the
same instance. Its country/uptime fields are the directory's observations, not
verified facts about the origin host or our own uptime measurement.

## Codeberg requests submitted — 11 October

The owner authorized submission using the `mycelibre` Codeberg account. These
three pull requests were created and independently read back as **open**, not
accepted or already listed:

| Service | Request | Files submitted |
| --- | --- | --- |
| GotHub | [PR222](https://codeberg.org/gothub/gothub/pulls/222) | Main project's `dev` README instance table |
| Kittygram | [PR100](https://codeberg.org/irelephant/kittygram/pulls/100) | `README.md` and `instances.json`, retaining `gram.utilibre.org` |
| TransLite | [PR31](https://codeberg.org/gospodin/translite/pulls/31) | `README.md` and `instances.json` |

GotHub's directory README and generator establish that `gothub-instances` is
generated from `gothub/gothub`'s `dev` README. The submission therefore corrects
the earlier draft's target instead of editing generated JSON. The request
discloses the checked source revision and the version endpoint's unknown-source
field rather than inventing a runtime value. All requests disclose Hetzner/Germany,
Cloudflare, the privacy page and the deployed-source offer. No uptime, universal
device coverage, provider-log deletion or listing acceptance is asserted.

Current README/rules, repository metadata, instance entries, full bounded PR
history and public issue searches were checked before submission; no Utilibre
duplicate was found. Public-browser checks passed immediately before submission:

- `node deployment/community/check-gothub.mjs`: styled desktop/mobile-width
  pages, repository and README reading, gzip/identity stylesheet responses.
- `node deployment/community/check-new-readers.mjs --only=gram`: profile, post,
  actual proxied media, desktop/mobile-width layouts; no third-party browser
  requests or HTTP/JavaScript failures observed.
- `node deployment/community/check-translite.mjs`: EN/ES translations, four
  engines, native engine switching, POST/no-store, cookies and input/path
  denials; no third-party browser requests observed.

These are Chromium checks, not physical-phone certification or uptime history.
Running image tags were verified as GotHub `24bedc8-p2`, Kittygram `5931c21-p1`
and TransLite `7b4b8e5-p3`. Public source downloads returned gzip archive bytes;
a Python-client source request received 403 while ordinary curl requests worked,
so automated-client access is not claimed universal. Cloudflare's proxied
wildcard and three non-country-filtering Skip rules were rechecked without
changing DNS/WAF configuration.

The API created public owner forks and one `add-utilibre-instance-20261011`
branch per repository, changing only the stated listing files. PR head commits:
GotHub `c040e7f5936c81a635f95250689f0367ebca4aad`, Kittygram
`bcec7319020671d0ae4bd8a2fe43c39495859bc8`, TransLite
`74fbe2e4279290edee9414b7131f1d893da587b1`. No application was deployed,
restarted or reconfigured. The one-off API procedure is retained privately at
`/opt/utilibre/reports/codeberg-submissions-20261011-37GhLq/submit.py`; the token
is read from the existing root-only secret file, never included in source,
commit content, remote URLs or output.

**SafeTwitch remains unsubmitted:** Codeberg's repository API reports
`SafeTwitch/safetwitch` as archived. No current replacement submission destination
was established from its README. No fork/PR was created against that archived
project, and no extra playback test was run for an ineligible submission target.
The token lacks `read:issue`, but repository-scoped PR operations succeeded;
broader issue permissions are not needed for these three completed submissions.
**Mezzo remains separate:** it requires Gitfield access and current-rule review,
not this Codeberg token. Existing GitHub requests were not changed or duplicated.

## Earlier GitHub follow-up

11 October read-only follow-up: Redlib #117, SearXNG #941,
AnonymousOverflow #203, Binternet #68 and Priviblur #303 remain open. No new
review comment/operator request appeared in the returned counts/update times.
No duplicate submission or maintainer message was sent. Filtered evidence:
`/opt/utilibre/reports/queue-closeout-20261011-8qA6VI/submissions.json`.

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

GotHub, Kittygram and TransLite are now submitted on Codeberg as recorded above;
SafeTwitch's archived repository prevents the prepared submission. Gitfield
access is still needed for Mezzo. 4get uses distributed
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

## Historical directory preparation, 10 October

Codeberg public GET access works. Gitfield's repository raw routes redirect to
sign-in in the 11 October recheck, so its current contribution rules also need
authenticated access; the earlier 10 October observations below are historical.
No retained login/token
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
[PrivateBin verification](records/privatebin-uploads-2026-10-10.md#directory-refresh-external).

11 October refresh investigation: the public upload indicator still shows
disabled. The actual Utilibre HTML contains the exact ` id="attachment" `
marker used by the directory's current scanner. Its native `/check` handler
returns the saved database row for an already-listed instance; it does **not**
force a rescan. Its `/add` handler inserts rather than updating existing rows.
Therefore neither repeated checking nor duplicate submission is a refresh fix.
The project's README assigns full scans to a daily `CRON=FULL` run, but the
operator's actual next run and successful fetch are not observable here. Keep
the working upload setting; wait for that upstream scan rather than bypassing
controls or claiming the green check is present. Sources, inspected 11 October:
[scanner](https://github.com/PrivateBin/Directory/blob/master/src/models.rs),
[routes](https://github.com/PrivateBin/Directory/blob/master/src/main.rs),
[scan schedule](https://github.com/PrivateBin/Directory/blob/master/README.md).

## Prepared submissions — not sent

Only SafeTwitch and Mezzo remain drafts. GotHub, Kittygram and TransLite were
submitted above after fresh checks; their earlier draft entries are superseded.
Before sending either remaining draft, establish a writable official destination,
check for an existing request/list entry, replay one relevant native journey,
and review the then-current rules. Do not submit a failing service or route a
request elsewhere merely to bypass an archived repository or missing access.

**SafeTwitch (blocked: repository archived):** issue/PR title `Add twitch.utilibre.org`; former destination
https://codeberg.org/SafeTwitch/safetwitch/issues/new . Proposed README row:

```markdown
| [twitch.utilibre.org](https://twitch.utilibre.org/) | 🇩🇪 | Utilibre / Hetzner; chat disabled; [privacy](https://utilibre.org/en/privacy) | ✅ |
```

Body: “I operate Utilibre and would like to list our SafeTwitch instance at
https://twitch.utilibre.org/. It is hosted on Hetzner in Germany, behind
Cloudflare. Chat is disabled. Our privacy information and deployed-source
offer are linked from the instance. Please add the row above.”

**Mezzo:** draft title `Add tenor.utilibre.org`, for the native issue form at
https://gitfield.org/fsky/mezzo-instances/issues/new . Body: “I operate Utilibre
and would like to list https://tenor.utilibre.org, hosted on Hetzner in Germany
behind Cloudflare. Privacy information: https://utilibre.org/en/privacy .”
This draft is intentionally **not ready to submit** until authenticated access
allows the current rules/template to be inspected and their maintenance/source
conditions and a native search/media journey to be checked. Do not check an
unverified compliance box or send the draft elsewhere to bypass sign-in.
