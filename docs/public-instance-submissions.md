# Public instance submissions — October 6, 2026

PrivateBin is listed. [Redlib PR117](https://github.com/redlib-org/redlib-instances/pull/117)
and [SearXNG request941](https://github.com/searxng/searx-instances/issues/941)
are existing requests, not claims of acceptance. SearXNG has its two-week wait label.

The token can push operator forks but cannot create upstream pull requests.
The Priviblur REST submission was retried on October 6 at 20:16 UTC and again
returned403 (`Resource not accessible by personal access token`); no PR was
created. Own-repository workflow writes work, which does not grant upstream
repository access. Use the prepared comparisons in an authenticated browser or
configure suitable forge authentication on the VM; do not put tokens in this file.
These changes are prepared, **not submitted or accepted**:

| Service | Prepared upstream comparison |
| --- | --- |
| AnonymousOverflow | [Review and open PR](https://github.com/httpjamesm/AnonymousOverflow/compare/main...mycelibre:AnonymousOverflow:utilibre-public-instance-20261006?expand=1) |
| DeGoog | [Review and open PR](https://github.com/degoog-org/degoog/compare/main...mycelibre:degoog:utilibre-public-instance-20261006?expand=1) |
| Binternet, HTTPS and Tor | [Review and open PR](https://github.com/Ahwxorg/Binternet/compare/main...mycelibre:Binternet:utilibre-public-instance-20261006?expand=1) |
| RSS-Bridge | [Review and open PR](https://github.com/RSS-Bridge/rss-bridge/compare/master...mycelibre:rss-bridge:utilibre-public-instance-20261006?expand=1) |
| ntfy | [Review and open PR](https://github.com/binwiederhier/ntfy/compare/main...mycelibre:ntfy:utilibre-public-instance-20261006?expand=1) |
| Priviblur | [Review and open PR](https://github.com/syeopite/priviblur/compare/master...mycelibre:priviblur:utilibre-public-instance-20261006?expand=1) |

BiblioReads accepts instance issues; its actual issue-creation attempt was also
denied by token permissions. Codeberg access is needed for SafeTwitch, GotHub,
Kittygram and TransLite; Gitfield access is needed for Mezzo. 4get uses distributed
operator-maintained lists rather than a central acceptance workflow. FMD's
alternative-implementations page is not a directory of public hosted instances.

LRCLIB's official frontend now replaces Dumb at `lyrics.utilibre.org`.
No official instance directory was found in the reviewed frontend/server
repositories. This deployment is a read-only client of the public LRCLIB API,
not an independent LRCLIB database mirror; do not submit it as one.

Do not submit broken deployments as healthy: Rimgo playback, LibreMDB and
BreezeWiki's complete page workflow still have upstream failures. Mumble is
password-protected with verified public TCP voice and inbound UDP routing;
it is not an open server, and public UDP audio remains unverified.
