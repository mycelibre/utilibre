# Addy reply authentication

Verified 2026-10-09 against Addy 1.7.3, the existing `utilibre-addy:1.7.3` image
(`sha256:47b07db6fcbf1618fdc178b696788ae01571094c94ef7fd61e48382f9cf4925a`),
and its native Rspamd 3.14.0. The Docker packaging revision is
`ec7934b4835518fe6a520dedf7ce97464cacd7cd` in
`/opt/utilibre/community-src/addy-docker`; the application revision is
`150983e3331e80bb72b619984dc5e3f5390ddb93`.

## Reason for this configuration

The installed `ReceiveEmail` command requires `X-AnonAddy-Dmarc-Allow` for
reply/send and unsubscribe decisions. With Rspamd disabled, merely trusting
that header would trust input supplied by a sender. Restricting the SMTP listener
to the operator's mail gateway authenticates the immediate connection, not the
original sender.

`../reply-header-checks` removes every incoming Addy authentication, spam and
quarantine decision header during Postfix cleanup. The native Rspamd milter
then removes any remaining copies and adds a fresh authentication result. It
adds the allow header only when its own DMARC evaluation passes. This reuses
Addy's upstream routine, not a replacement authentication backend.

PMG is the immediate SMTP peer. Its private IP is not the original sender's
SPF address. A preserved, aligned valid DKIM signature can still pass DMARC.
An absent, altered or misaligned signature does not authorize a reply. Ordinary
forwarded messages are not globally rejected for SPF/DMARC policy failure;
Addy's native reply authorization remains responsible for refusing unauthenticated
reply/send attempts. Temporary authentication DNS errors, scanner timeouts and
an unavailable scanner produce a temporary SMTP failure rather than fail open.
An unrelated failing signature does not override another aligned valid signature.

## What runs and what does not

The five enabled native modules are DKIM, SPF, DMARC, milter headers and the
temporary-failure action. The native local account-blocklist callback is retained
when the image's init 14 script has generated it. Its request goes only to
`127.0.0.1:8000/api/blocklist-check`; the existing application secret is neither
copied into this repository nor exposed in reports.

The stock content-rule suite, classifier, greylisting, DNSBL, fuzzy checking,
URL/provider lookups, AI integrations, history/Redis exporters, aggregate
reporting and controller are disabled. DKIM and ARC **signing** are disabled.
Existing PMG signing remains unchanged; this configuration does not publish or
change a signing key, selector or DNS record. The native image still prepares
its existing key files during initialization. The observed installed key existed
before this change; its contents were not read for this review.

Authentication queries use the existing resolver in `/etc/resolv.conf`. DNS
resolvers and authoritative DNS services receive the relevant authentication
domain/selector queries; this is not a promise of zero external requests or
unknown providers' retention. No new resolver, provider, firewall exception or
public listener is required. DKIM/SPF caches are bounded at 1000 entries and 1 hour;
these are authentication records, not a message archive. Recent-message history,
statistics output and RRD paths are disabled with native null values. The normal
native error log remains: errors can contain identifiers. Existing rotation and
application/queue/backups retention are not changed here.

The normal and proxy workers each have one process and listen only on container
loopback. DNS and task deadlines are bounded. Existing app CPU, memory, process,
SMTP source restrictions and startup firewall remain authoritative. The isolated
Rspamd plus Postfix fixture used about 72 MiB after the checks within a 256 MiB / 1 CPU
limit; this is not a whole-application capacity or delivery benchmark. A fresh
image started within the 60-second readiness window.

## Deployment integration

The parent deployment owns the actual rollout and its pre-change backup. Add
these readonly mounts to the existing app, without removing the existing header
scrub or SMTP startup mounts:

```yaml
- ./rspamd:/etc/utilibre-rspamd:ro
- ./rspamd/91-utilibre-reply-auth:/etc/cont-init.d/91-utilibre-reply-auth:ro
```

Set the existing native environment variables:

```dotenv
RSPAMD_ENABLE=true
RSPAMD_NO_LOCAL_ADDRS=true
RSPAMD_GREYLIST_ENABLE=false
```

The executable 91 hook runs after native configuration generation. It sets the
inbound milter and `milter_default_action=tempfail` before configuration checking,
so a later error cannot restore fail-open scanning. `non_smtpd_milters` remains
empty, preserving the prior path for application-generated outgoing messages.
It installs these native overrides and runs `rspamadm configtest`. Init does not
start an additional service: it configures the image's existing s6-managed Rspamd.
Use the existing guarded `utilibre-addy-smtp.service` to restart the affected app;
do not start the published SMTP listener outside that firewall-first procedure.

After startup, check native config syntax, milter settings, module/signing state,
worker listeners, app health, queue metadata and the source 10.10.1.20 firewall. The
isolated checks do not prove a real recipient's reply delivery. That final check
uses only the already-authorized operator-controlled mail flow.

Rollback restores the saved environment and mounts through the same guarded
service. **Keep `reply-header-checks` and its existing 90-hook setting enabled.**
With Rspamd off, native replies remain unavailable rather than trusting forged
allow headers. Preserve the database, queue, account/alias state, signing keys and
all existing backups. Remove this adaptation when upstream provides an equivalent
minimal verification-only native configuration and the same regression passes.

## Reproduce without delivering mail

```sh
sudo python3 deployment/addy/rspamd/run-check.py \
  /opt/utilibre/reports/addy-rspamd-20261009-canonical
```

The runner checks the exact upstream revision, refuses to reuse an existing
fixture container, starts the pinned image with `--network none`, no published
ports and no application/data/secret mount, and removes it in `finally`. It uses
only a namespace-loopback fictional DNS server, freshly generated in-memory keys
and an in-namespace native Postfix queue with delivery deferred. The test inspects
and deletes only those fictional queue entries. No email leaves the namespace.
The host's already-installed Python `cryptography`, Docker and `nsenter` are used;
there is no added production dependency.

The canonical run passed aligned DKIM, unsigned forged headers, altered body,
misaligned signature, authentication DNS failure, a valid signature accompanied
by an unrelated DNS failure, and unavailable scanner cases. It checks the actual
queued headers after Postfix cleanup and milter processing, including duplicate
header casing. DNS observations contain only fictional `.invalid` names, and the
native blocklist requests reach only the local fixture. The normal-worker HTTP
check also models the real private PMG source IP. The SMTP fixture uses loopback;
it does not pretend to originate from the remote gateway.

Private evidence is under the report directory: `result.json`,
`final-configdump.json`, `dns-queries.json`, `local-blocklist-requests.json`,
`resources.txt`, and `cleanup.json`. No private key or real correspondence is
stored in this recipe or the evidence.

Native references: [DMARC](https://docs.rspamd.com/modules/dmarc/),
[DKIM](https://docs.rspamd.com/modules/dkim/),
[milter headers](https://docs.rspamd.com/modules/milter_headers/),
[options](https://docs.rspamd.com/configuration/options/), and the pinned image's
`14-config-rspamd.sh`, `15-config-postfix.sh` and application `ReceiveEmail.php`.
