# Native wording follow-up, 9 October 2026

This follows the public copy release and supersedes the related pending entries
in the earlier copy inventory. Spanish operator-owned wording uses voseo.
Upstream controls, legal notices, privacy facts, limits and data handling remain
unchanged. No advertising analytics, extra provider or application was added.

## Applied changes

| Surface | Native mechanism / scoped change | Verification |
| --- | --- | --- |
| Identity confirmation and password-reset emails | Authentik 2026.8.3's supported `/templates` directory, mounted read-only in its existing server and worker. Two small EN/ES templates extend the upstream email base and preserve the native URL/expiry variables. Only the two existing EmailStage `template` fields were changed; future invitation/recovery configuration selects the same templates. | Six fictional native renders in `en`, `es` and `es-gt` passed. Native choices contain both templates. Each complete model was compared before/after to assert no other stage-field change. Both mounts are read-only, the PostgreSQL container ID/start time stayed unchanged and the public login returns 200. No message was sent; no token, account, session, MFA or retention setting was changed. |
| PairDrop catalog button | Existing `CUSTOM_BUTTON_TITLE`, now live as **Más herramientas de Utilibre / More tools from Utilibre**. Only PairDrop was recreated after repeated zero-client observations at its native TCP listener. | Three final zero-established-connection counts were required before the scoped recreation. Native public `/config` and the rendered button title/destination passed. The same pinned application and existing RTC/fallback configuration remain. No addresses or transferred content were inspected; this wording check is not a new cross-network transfer test. |
| LRCLIB instance introduction | One equivalent Spanish paragraph and neutral heading in the existing source patch. Image `utilibre-lrclib:f37c070-p3`; the unchanged adapter still performs bounded read-only LRCLIB searches. | Native adapter tests: 14 passed. Public canonical HTTPS mobile page shows both notices without overflow or external browser requests. Only the application was recreated; gateway ID/start time unchanged. No real lyrics query was needed for copy verification. |
| TransLite provider warning | One equivalent Spanish paragraph in the existing PHP header patch. Image `utilibre-translite:7b4b8e5-p2`; literal **Multiple engines** remains to identify the installed control. | Build PHP syntax checks and 25 URL/IP/cache checks passed. Public canonical HTTPS mobile page shows the provider/2000-character/audio warning in both languages, without overflow or external browser requests. Gateway ID/start time unchanged; only PHP application recreated. No text was submitted to an external translation provider in this check. |
| Chhoto URL expiry/footer | Existing HTML patch now pairs the 30-day/no-click-statistics/original-URL notice and optional catalog/security links in EN/ES. Image `utilibre-chhoto:7.8.3-p2`. | The unchanged Rust backend/dependency build layers were reused. Public canonical HTTPS mobile copy passes with no external requests. A fresh random fictional link is created with the native button, returns the exact 307 destination and is then deleted through the native operator endpoint; anonymous deletion is denied. No real records are listed. The scoped check records its outcome separately. Gateway ID/start time unchanged. |
| Rallly catalog links | Supported native footer JSON field, preserving all three existing links and adding the two EN/ES catalog destinations. No admin impersonation or application fork. | Exact settings backup/concurrent-change guard, three zero-client observations, native graceful web-process restart and unchanged PostgreSQL/gateway start times. EN/ES desktop/mobile login recovery and fictional invite footers passed; only the exact fixture/two dates were removed. Normal OIDC and native JavaScript dependency remain; see `rallly-navigation-2026-10-09.md`. |
| Vikunja Settings catalog links | Supported native OIDC `extra_settings_links` supplied by a Vikunja-only static Authentik mapping, using its existing `profile` scope. Both EN/ES links appear after the next full sign-in. | Actual public password/MFA sign-in and fresh desktop/mobile Settings views passed. Both exact labels/destinations are accessible, no extra request hosts or page errors occurred, and the fictional native account was deleted. No application rebuild/restart, provider-field change or permission change. |
| Donetick first-task hint | Two native EN/ES locale values in the existing frontend patch remove the inaccurate disabled voice/scanning suggestion. Current image `utilibre-donetick:0.1.80-p3` also fixes the narrowly scoped native refresh-session deletion omission found during backup verification. | Public native MFA login and language-menu selection show the correct hint on desktop/mobile. The deletion regression fails before the backend fix and passes afterward, preserving another account's active session; public native account deletion removes its sessions and old access/refresh credentials fail. Retained backups pass integrity/foreign-key checks. See the service deployment record for exact recovery and fixture cleanup. |

The original English notices remain with equivalent Spanish, not contradictory
replacement assurances. Native application menus can still be English where
upstream has no locale support; this is not a full application translation fork.

## Preserved state and recovery

The identity updater stores only prior stage names/template paths in the private
`/data/utilibre-copy-backups/` directory. To reverse that selection, restore only
the prior `template` values. Keep current token expiry, MFA, account and flow
settings. Remove the added read-only mount only during a routine identity update;
do not replace the identity database or run full bootstrap scripts.

Chhoto's online SQLite/private-configuration backup was completed before its
application recreation at `/opt/utilibre/chhoto-backups/20261009T030250Z`.
No schema or backend change was made. Reverting this copy needs only the previous
image, not a database restore; restoring an older database would overwrite newer
links and is not authorized by a wording change. Existing backups and their
retention were left unchanged.

Private evidence and exact pre-change compose/container references are under
`/opt/utilibre/reports/native-copy-20261009/`. LRCLIB/TransLite are stateless
frontends with their existing temporary caches/session behaviour; their gateway
containers were not restarted. Old images remain available. Revert only the
affected application image or native field, preserving current deployment
configuration and data.

## Source offers

`publish-copy-sources.py` validates immutable upstream commits and patch
applicability, then packages reviewed Git source and selected public recipes for
LRCLIB and Chhoto. It never traverses runtime data, credentials or backups.
TransLite uses its existing `publish-translite-source.sh`. All three modified
source archives are refreshed to match these builds. Identity templates and the
PairDrop configuration are in the existing integration source offer; the parent
publishes that archive after the combined release review.

To reproduce LRCLIB, apply `deployment/community/lrclib-source.patch` to its
`f37c07042be1af5fdcc7932d090af32141089751` source and use the existing
`Dockerfile.lrclib`, with `deployment/community` as the named `integration` build
context. For Chhoto, the existing `deployment/chhoto/build.py` applies the patch
to `e18a8a0111e94be03145e95c30dcd7f41891633d`, verifies vendored resources and builds
the native image. TransLite's published source includes its existing Dockerfile,
configuration and verification checks.

## Precise remaining limits

- WBO's landing punctuation is now live in `utilibre-wbo:2.9.0-p3`.
  A rehearsed, one-time native-history transfer through tmpfs/process memory preserved the existing
  board byte for byte; its normal temporary-storage/retention settings remain
  unchanged. No board identifiers or contents were exposed, and no
  regular-file board archive was made. Host swap remains an explicit limitation
  in [the preservation and verification record](wbo-ram-update-2026-10-09.md).
- Eight newer applications have no supported arbitrary catalog anchor in the
  installed native configuration: Spliit, Wishlist, linkding, KitchenOwl,
  ByteStash, Radicale, Calino and Razzia. The exact source/configuration evidence
  is in `instance-navigation.md`. Existing legal and upstream links keep their
  actual meanings; no generic response injection, custom authentication flow or
  promotional source fork was added. Vikunja was resolved through its native
  OIDC `extra_settings_links`: both catalog links now appear in authenticated
  Settings after the next full sign-in. Its logged-out screen is unchanged.
- Upstream notification bodies outside the two configured identity email stages
  have not been rewritten. Those two previously identified tú templates are now
  superseded by the native voseo templates; this does not claim every upstream
  application message has been translated.

## Deployed provider clarification, 9 October

The existing TransLite header patch now names DuckDuckGo's Microsoft downstream,
DeepL free-service model improvement and Yandex's text-bearing backend URL, with
equivalent EN/ES voseo warnings against passwords, personal or confidential text.
It preserves the literal Multiple engines control, input bound and disabled
audio. Installed parser hashes and the primary-policy scope are recorded in
[the privacy review](privacy.md#provider-policy-and-endpoint-review-9-october-2026).
PHP syntax,25 native URL/IP/cache checks and reverse patch applicability pass. The native public application is now `utilibre-translite:7b4b8e5-p3`; p2 remains available for rollback.

The existing Dockerfile’s application target was rebuilt and only the scoped PHP application container was replaced. The gateway, PHP/session configuration and providers were unchanged. Public1280px and390px checks passed both native language notices with no overflow, page errors or outside browser requests. No translation text was submitted in this copy check. Screenshots were visually reviewed. Evidence is under `/opt/utilibre/reports/addy-forward-20261009/translite-p3-*`. Reverting the application image requires no data restore. Matching source is published through `publish-translite-source.sh`.
