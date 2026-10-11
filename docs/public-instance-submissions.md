# Public instance submissions, checked 11 October 2026

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
[PrivateBin verification](privatebin-uploads-2026-10-10.md#directory-refresh-external).

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

These are reviewable native entries, not evidence of acceptance or fresh
end-to-end operation. Codeberg/Gitfield authentication is still missing. Before
sending, check for an existing request/list entry, replay one relevant native
journey, and review the list's then-current rules. Do not submit a failing
service. The four Codeberg formats were inspected on 11 October. The zone API
reports no exact DNS records for these hosts and a proxied wildcard A record;
Cloudflare use is therefore disclosed rather than inferred from server country.

**SafeTwitch:** issue/PR title `Add twitch.utilibre.org`; destination
https://codeberg.org/SafeTwitch/safetwitch/issues/new . Proposed README row:

```markdown
| [twitch.utilibre.org](https://twitch.utilibre.org/) | 🇩🇪 | Utilibre / Hetzner; chat disabled; [privacy](https://utilibre.org/en/privacy) | ✅ |
```

Body: “I operate Utilibre and would like to list our SafeTwitch instance at
https://twitch.utilibre.org/. It is hosted on Hetzner in Germany, behind
Cloudflare. Chat is disabled. Our privacy information and deployed-source
offer are linked from the instance. Please add the row above.”

**GotHub:** PR title `Add gothub.utilibre.org`; append to the existing array at
https://codeberg.org/gothub/gothub-instances/src/branch/master/instances.json :

```json
{
  "country": "Germany",
  "link": "https://gothub.utilibre.org",
  "tor": false,
  "cloudflare": true,
  "host": "Hetzner",
  "branch": "dev",
  "version": "24bedc80",
  "fiberversion": "2.52.15",
  "goversion": "go1.26.8"
}
```

PR body: “I operate this Utilibre instance. The base is dev revision
24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2 with published Utilibre p2 patches.
The runtime version endpoint reports Fiber 2.52.15 and Go 1.26.8 but does not
identify the source revision; the entry uses the checked build source instead.
Hosting is Hetzner/Germany with Cloudflare. Privacy:
https://utilibre.org/en/privacy .” The local reviewed checkout's branch is
`dev`; do not label it `master` merely because the directory uses that branch.

**Kittygram:** PR title `Add gram.utilibre.org`; append at
https://codeberg.org/irelephant/kittygram/src/branch/main/instances.json :

```json
{
  "url": "https://gram.utilibre.org",
  "tor": null,
  "i2p": null,
  "yggdrasil": null,
  "country": "DE"
}
```

PR body: “I operate Utilibre's Kittygram instance at https://gram.utilibre.org.
It uses reviewed revision 5931c21c0990d4b216e97166dd78c03c9965567a with published
Utilibre changes. It is hosted in Germany on Hetzner and uses Cloudflare; the
current JSON schema has no Cloudflare field, so I am disclosing that here.
Privacy: https://utilibre.org/en/privacy .” Preserve `gram`, not the retired
Instagram hostname.

**TransLite:** PR title `Add translate.utilibre.org`; append at
https://codeberg.org/gospodin/translite/src/branch/master/instances.json :

```json
{
  "url": "https://translate.utilibre.org",
  "type": "http",
  "provider": { "name": "Utilibre", "url": "https://utilibre.org" },
  "location": "DE",
  "features": { "official": false, "cloudflare": true }
}
```

PR body: “I operate this Utilibre instance on Hetzner in Germany, behind
Cloudflare. It uses source revision 7b4b8e51359338219463f14c2a06211b6998a11e
with published Utilibre p3 changes. Submitted text is forwarded to the selected
translation provider; our instance notice describes this, without promising
provider anonymity or retention. Privacy: https://utilibre.org/en/privacy .”

**Mezzo:** draft title `Add tenor.utilibre.org`, for the native issue form at
https://gitfield.org/fsky/mezzo-instances/issues/new . Body: “I operate Utilibre
and would like to list https://tenor.utilibre.org, hosted on Hetzner in Germany
behind Cloudflare. Privacy information: https://utilibre.org/en/privacy .”
This draft is intentionally **not ready to submit** until authenticated access
allows the current rules/template to be inspected and their maintenance/source
conditions and a native search/media journey to be checked. Do not check an
unverified compliance box or send the draft elsewhere to bypass sign-in.
