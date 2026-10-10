# Rallly native catalog links, 9 October 2026

Rallly 4.15.4 now includes **More tools from Utilibre** and **Más herramientas de
Utilibre** in its native footer. Their destinations are `https://utilibre.org/en/`
and `https://utilibre.org/es/`, without referral parameters or tracking. All
three previously configured links and the upstream attribution remain intact.

## Native setting and preservation

The existing **Control panel → Settings → Footer links** feature stores an
ordered array in `instance_settings.footer_links`. The native schema permits
five HTTP(S) links, with labels up to 40 characters. Its loader revalidates stored
entries explicitly including database-edited configuration. The native feature
is not gated by the paid branding option.

`deployment/community/configure-rallly-footer.py` applies only that supported
setting and its normal modification timestamp. It validates the same bounds,
retains existing entries, locks the settings row, and aborts if any concurrent
setting differs from the read snapshot. Every other field is compared after
the transaction. No account was made an administrator, no owner password or
session was obtained, and no authentication/registration permission changed.
No application source patch or replacement interface was introduced.

The original single settings row is stored root-private under
`/opt/utilibre/reports/native-navigation-20261009/rallly-instance-settings-before-*.json`.
It is not a full database copy and contains no poll records. For rollback, remove
only the two newly added entries, using that original field as evidence and a
concurrent-change guard. Preserve any later operator additions and every other
setting. Do not restore an old database or overwrite the complete settings row.

## Cache and scoped restart

`getInstanceSettings` uses the native `instance-settings` cache tag with no
timed revalidation. The installed Next 16.3.8 cache keeps an in-process copy as
well as a fetch-cache file. Running `updateTag` in a separate CLI process would
not invalidate the running process. Removing cache files alone was not presented
as sufficient.

The app has a read-only root and only cache/tmp tmpfs mounts. Polls, options,
participants, votes, accounts and sessions are PostgreSQL-backed. After three
zero-established-client observations on the native HTTP listener, SIGTERM was
sent to the sole Next server process. Its native handler stops accepting new
connections and finishes pending requests before closing. The existing runtime
restart policy then restarted the same container/image and refreshed the cache.
PostgreSQL and gateway container IDs/start times remained unchanged. No database,
poll, session, upload, retention rule or backup was removed by this operation.

## Public checks and fixture cleanup

Actual public HTTPS checks passed in English and Spanish at 1440×1000 and 390×844.
Both native catalog anchors and all three existing anchors are visible and
clickable on the login recovery page and a fictional poll invitation. The
screenshots were inspected; no horizontal overflow, page/console errors or
unexpected request hosts occurred. The existing identity provider is the only
separate allowed authentication host.

Ordinary JavaScript login still redirects to the sole configured OIDC provider.
The stable native login recovery state was tested with the standard
`error=access_denied` parameter. Plain login HTML also contains the footer
anchors, but Next's streamed async boundary remains hidden without JavaScript;
this check does not claim Rallly's application works without JavaScript. The
portal's essential no-JavaScript navigation is a separate verified surface.

The invitation check used one explicitly fictional storage fixture with two
dates, no account, no invite email and no participants. It verifies rendering,
not a new poll-creation workflow. Cleanup checked its exact random identifier,
title, absence of owner/space/participants/comments/invites/votes, and two date
options, then removed only that fixture. The two options were removed by the
native database cascade. Its former invitation renders the native not-found
result and contains no fixture title; Next streams that result with HTTP 200.
No real poll or user record was read or modified, and no message was sent.

Evidence and screenshots are private in the same navigation report directory.
The configuration helper and focused checks enter the existing integration
source offer; the upstream Rallly application image is unchanged.
