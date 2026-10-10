# FreshRSS article export verification, 9 October 2026

FreshRSS 1.29.1's native web export includes at most 50 articles per
selected feed. The separate starred/labelled selection is not subject to that
per-feed bound. The public EN/ES export guide now explains the distinction.
OPML remains a subscription/category export, separate from article content/state.

The existing exact application image
`sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d`
was tested with a fresh PostgreSQL fixture. Both containers used bounded RAM
storage and a network-none namespace. No production data, secrets, real feed,
SMTP, host port or outside browser request was used.

The fixture contained 53 articles with different read/unread, favourite and label
states. Native browser downloads produced 50 feed articles, five starred/labelled
articles, and 52 distinct articles in the combined ZIP. One ordinary article was
absent from that ZIP. Two independent accounts imported the native JSON and ZIP;
the checked titles, authors, text, dates, URLs, read/unread, favourite and label
values matched their source. Repeating the JSON import created no duplicate
articles or changed state.

The supported operator command `export-zip-for-user.php --max-feed-entries=100`
included all 53 fixture articles. This is a separate positive per-feed limit,
not an unlimited export or a control available in the web interface. The CLI
rejects `-1`; its internal exporter accepting a negative value does not establish
that the command-line parser supports it. A larger archive requires a suitable
bound and enough retained source data. Credentials/preferences, external media,
other feed-reader importers and complete account migration were not checked.

The imported accounts were deleted through the native CLI. The source account
was the isolated default administrator, which FreshRSS correctly refuses to
delete through that action; its RAM data was discarded with the fixture.
Both containers were removed. Production storage and backup retention are
unchanged.

Reproduce with `python3 deployment/utilibre/tests/check-freshrss-articles.py`.
It uses the existing Playwright installation and native CLI/browser import/export
interfaces. Earlier harness failures concerned an unreadable root-owned copied
fixture, the unsupported negative CLI bound and attempted default-account
deletion. Those were corrected in the checker; no application change was needed.

Passing evidence: `/opt/utilibre/reports/freshrss-articles-yi91mpp_/result.json`,
`browser.json` and `cleanup.json`. Fictional downloads and screenshots remain in
that private report directory.
