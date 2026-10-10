# Existing Proxmox mail gateway: service routes and delivery state

Verified 2026-10-09: `10.10.1.20:26` responds as `mx.mailgt.dev ESMTP Proxmox`. STARTTLS validates against the public CA certificate for `mx.mailgt.dev` (TLS 1.3; certificate expiry 2026-12-01). `10.10.1.18:26` refuses connections. That initial transport probe sent no SMTP DATA. The later authorized setup-message transfers and separate gateway-generated test are historical checks, detailed below. The owner-confirmed14:09UTC native Addy forward reached Gmail with SPF, DKIM and DMARC passing through PMG selector `pmg`. Native reply authentication is deployed and locally checked. The owner also confirmed that the Gmail reply reached the original sender’s admin inbox after Addy handed it to PMG at14:36:49UTC.

The current public DNS has `utilibre.org MX 10 mx.mailgt.dev.`, `mx.mailgt.dev A 49.12.84.228`, no AAAA on that mail hostname, and root SPF `v=spf1 ip4:49.12.84.228 -all`. Root DMARC is `p=reject; sp=reject`. At02:41UTC, aliases.utilibre.org also returned SPF `v=spf1 ip4:49.12.84.228 -all`;49.12.84.228 had PTR mx.mailgt.dev. These DNS observations alone did not prove outbound source IP or delivery. The later owner-confirmed tests establish the source/delivery facts only for their specific routes; they do not audit every gateway setting.

## Proxmox routes and source restrictions

The operator configured the first two dedicated routes below. Their reproducible native locations are **Configuration → Mail Proxy → Relay Domains** and **Transports**. Keep the existing default transport, `utilibre.org` route and MX unchanged. Use protocol SMTP and **Use MX = No** for these internal targets.

| Receiving domain | Transport host | Port | Backend state |
| --- | --- | --- | --- |
| `newsletters.utilibre.org` | `10.10.1.43` | `2526` | Operator receive test reached its generated native feed |
| `aliases.utilibre.org` | `10.10.1.43` | `2527` | Verified owner alias forwards through PMG to Gmail; SPF/DKIM/DMARC passed on9 October |
| `simplelogin.utilibre.org` | `10.10.1.43` | `2528` | **Do not enable yet:** listener remains loopback-only; dependency-security publication blocker |

Do not add broad Internet or Docker networks to trusted relay networks. The ready VM listeners publish only `10.10.1.43:2526` and `10.10.1.43:2527` and accept only source `10.10.1.20`, with host INPUT/OUTPUT/FORWARD and SMTP-container INPUT restrictions. Host loopback publications and local VM/bridge exceptions have been removed. Internal container loopback port 25 remains available to the native application; it is not a host-published exception. A one-use FIFO startup permit opens the native process only after its namespace restrictions are installed. The operator subsequently confirmed routed SMTP delivery. This worker cannot run a client on the separate Proxmox VM, and did not read or change its management settings. Local host/other-container negative tests independently passed. The newsletter controlled receive test produced its expected feed-entry title at02:28:30UTC; no body was inspected for that routing check.

addy also supports username subdomains. Do not assume that the exact root-domain route automatically authorizes or routes every subdomain. If that feature is enabled for users, configure and test corresponding Proxmox subdomain matching plus wildcard MX deliberately. No wildcard or whole-domain catch-all was added here. Verify unknown-recipient handling from Proxmox before describing it as rejection: an incoming test for the requested, not-yet-configured Addy account was accepted by Postfix and skipped by native application processing. Do not equate a receiver response with successful forwarding.

## DNS and signing state

Both authoritative nameservers returned these dedicated MX records at02:24UTC; they preserve the existing root-domain MX:

```dns
newsletters.utilibre.org.  IN MX 10 mx.mailgt.dev.
aliases.utilibre.org.      IN MX 10 mx.mailgt.dev.
```

Cloudflare's ordinary HTTP proxy must not proxy the mail target. No new public SMTP NAT/port is needed if the existing Proxmox public port 25 already receives mail for these domains; only the explicit internal transports change. The operator-tested newsletter receive path worked; general public listener policy and provider permission are not established merely by the earlier port26 handshake.

Do not publish a guessed SPF or DKIM record. The observed forwarding path uses the verified outbound policy and PMG signer; preserve them. Keep the existing root DMARC policy. Setup notifications use header From admin@utilibre.org and an envelope sender at aliases.utilibre.org. With the existing relaxed alignment defaults, a successful aliases SPF result from the declared gateway IP can align with that From domain. The operator’s separate local test confirmed outbound IP49.12.84.228 and aligned SPF/DMARC at Gmail. That earlier gateway-generated message had no DKIM signature. The later native Addy forwarding test reached Gmail with DKIM pass using PMG selector `pmg` for `aliases.utilibre.org`; SPF and DMARC also passed. Root `sp=reject` applies when the author domain is a covered subdomain; it is not selected merely because the envelope sender is a subdomain. Do not weaken root DMARC as a shortcut.

The addy public key exists at `/opt/utilibre/addy/data/app/dkim/aliases.utilibre.org.txt`, but its generated label omitted the selector because the upstream helper was invoked outside its initialized environment. The public key matches the preserved private key. The configured selector is `default`, giving owner name `default._domainkey.aliases.utilibre.org`; that DNS name was absent at02:41UTC. Native `anonaddy.dkim_signing_key` is null and local Postfix has no signing milter. CustomMailer signs forwards/replies/sends only for enabled, verified custom-domain aliases with their signing flag and key, not shared-domain aliases or setup notifications. The new local Rspamd milter verifies authentication; its signing modules remain disabled. Publishing this public key alone cannot sign setup emails. The working signer is now verified as PMG selector `pmg` for `aliases.utilibre.org`. Preserve it; the staged Addy `default` key is unrelated and remains unused. Do not regenerate or disclose the private key. SimpleLogin's native selector is `dkim`; its prepared public record remains staged with the application.

## Transport encryption and tests still needed

Outbound addy and the staged SimpleLogin relay path use `mx.mailgt.dev` mapped privately to `10.10.1.20`, with mandatory certificate-verified STARTTLS on 26 and no authentication. That verified outgoing hop is separate from inbound Proxmox-to-application transport. Newsletter SMTP currently offers its staging self-signed certificate; addy's inbound production TLS has not been enabled. Both inbound listeners accept only the private gateway source, not the application VM or other containers. Decide and verify the intended private-hop TLS policy before promising authenticated TLS there.

The approved Addy setup operation produced two verification notifications because the native registration listener is duplicated, plus one reset notification. All were handed successfully to the gateway; local Postfix has no pending mail. No manual resend occurred in that initial operation, and final receipt of those particular setup messages was not confirmed. One separate native verification notification was later explicitly authorized and sent; its detailed history is in the Addy deployment record. That was the earlier setup state: recipient verification and the requested alias were complete by04:53UTC. The owner-authorized native forwarding check reached Gmail at14:09UTC. Keep message bodies, private links, account identifiers and delivery queue identifiers out of public documentation.

The owner explicitly authorized the14:09 native test, confirming inbox receipt and passing SPF/DKIM/DMARC. Native reply authentication is now deployed with the existing Rspamd service: only DKIM/SPF/DMARC, decision-header handling and failure actions, plus the native local account blocklist. Postfix strips supplied Addy decision headers, accepts only freshly computed authorization, and temporarily fails when the scanner or required DNS authentication is unavailable. The milter/scanner listen only on container loopback11332/11333; PMG-only SMTP ingress and outbound signing/TLS remain unchanged. The later controlled reply delivery is owner-confirmed; no mailed export or CSV import is called tested. See the Addy deployment record for exact scope.

The Addy public HTTPS login is available through Caddy. Its private web3211 listener accepts only edge10.10.1.3, with localhost administration retained. Newsletter web3210 uses a source-specific DNAT rule to the existing native gateway namespace, without restarting the app; direct edge HTTPS returned200. Both web DNS records are now present and the operator confirmed external browser access. SimpleLogin remains staged and is not publicly exposed. All backup retention is unchanged; no pruning was performed.

Primary reference: [Proxmox Mail Gateway administration guide, Mail Proxy sections](https://pmg.proxmox.com/pmg-docs/pmg-admin-guide.html#chapter_mailproxy). The guide describes relay-domain, transport and trusted-network controls; it does not establish this remote gateway's active configuration.

Alignment reference: [RFC 9989, sections 4.4 and 4.7](https://www.rfc-editor.org/rfc/rfc9989). Native deployment reference: [Addy self-hosting instructions](https://addy.io/self-hosting/); upstream examples do not establish this instance's signer or DNS.

## Gateway delivery update

The operator reports the mail-delivery issue fixed. A controlled locally generated
message from public IP `49.12.84.228`, with envelope domain `aliases.utilibre.org`,
was accepted and delivered by Gmail; SPF and DMARC passed through normal relaxed
alignment. That message had no DKIM signature. This establishes that tested
PMG-to-Gmail route, not the authentication of every Addy notification or forward.
The recipient was still unverified at03:21UTC, but native verification and alias setup were complete by04:53UTC. The subsequent owner-authorized native forwarding check at14:09UTC reached Gmail; the owner supplied matching SPF/DKIM/DMARC pass results with PMG selector `pmg`. No verification fields were forged and no signing key was changed.

## Deployed local reply-authentication check

At14:32UTC the live guarded Addy service confirmed `smtpd_milters=inet:127.0.0.1:11332`, no `non_smtpd_milters`, `milter_default_action=tempfail`, native header checks, loopback-only verifier listeners, gateway-only SMTP ingress and an empty queue. Within Rspamd, this profile uses sender-authentication DNS lookups; local signing, ARC, classifiers, message history and external content-checking modules are disabled. Native Postfix separately retains its existing Spamhaus client-IP and sender/host-domain DNS blocklist restrictions; Rspamd’s module limits do not remove those checks. Error logs remain separate from disabled message history.

Seven isolated fictional cases passed before this rollout. Valid aligned DKIM authorizes despite SPF failing on the private PMG hop; unsigned, tampered or misaligned messages cannot obtain the Addy reply-authorization header, including when they supply forged headers. Required DNS failure or scanner unavailability returns SMTP451. A valid aligned signature remains usable despite an unrelated DNS failure. Ordinary SMTP250 acceptance without the authorization header does not bypass the native reply guard. These isolated checks alone did not establish an external reply round trip. The owner subsequently confirmed the native Gmail reply in the original sender’s inbox, following PMG acceptance at14:36:49UTC and an empty local queue. That closes one controlled exchange, not every sender/provider combination.

Evidence: `/opt/utilibre/reports/addy-rspamd-20261009-canonical/result.json` and `/opt/utilibre/reports/addy-forward-20261009/auth-live-check.json`. The working PMG selector `pmg`, DNS policy and signing key were unchanged; no Addy `default` selector activation is required for the tested forwarding route. All prior backups and their retention remain unchanged.

## Retained Postfix DNS blocklist boundary

Selected live `postconf` output retains `reject_rbl_client zen.spamhaus.org=127.0.0.[2..11]` and sender/HELO/reverse-client domain checks against `dbl.spamhaus.org=127.0.1.[2..99]`, with a Zen127.255 error warning rule. The controlled reply produced an open-resolver warning but delivered. Do not equate configured DNSBL rules with verified results for every query, or describe all spam filtering as disabled just because Rspamd has no content classifier.

These Postfix checks send client-IP/mail-domain query metadata through the configured resolver to Spamhaus, not message bodies. Their exact provider retention is unverified. The protocol and open-resolver distinction are explained by [Spamhaus’s DNS-query documentation](https://docs.spamhaus.com/datasets/docs/source/70-access-methods/data-query-service/000-intro.html) and [usage FAQ](https://www.spamhaus.org/faqs/dnsbl-usage/). No runtime DNSBL/rejection/resolver settings were changed. Detailed native reply scope and private metadata evidence are in [the Addy deployment record](../../docs/addy-deployment-2026-10-09.md#controlled-external-reply-and-retained-dnsbl-checks).
