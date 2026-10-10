# Kill the Newsletter deployment — 9 October 2026

Installed from upstream v2.1.3, commit `c2d7cf8f7d9927fd19a36ea9beaf0ced67afcefc` (MIT), as `utilibre-newsletters:2.1.3-p2` for the web worker and `2.1.3-p1` for the unchanged SMTP/background workers. Source: https://github.com/leafac/kill-the-newsletter . The pinned Node build uses the upstream native CLI: one HTTP worker, one SMTP receiver and one background worker. It does not spawn one process per VM CPU. Production npm audit reported zero known advisories on this date; this is not a guarantee of absence of vulnerabilities.

## Actual availability

The web gateway is available to the existing Caddy edge at **10.10.1.43:3210**, restricted to source **10.10.1.3**; localhost administration remains at127.0.0.1:3210. A source-specific DNAT rule reaches the existing shared web/gateway namespace without recreating either container. SMTP is bound only to **10.10.1.43:2526**, restricted to source **10.10.1.20**. Host loopback SMTP publication and local VM/bridge exceptions were removed at the operator’s request. At02:49UTC, the owner-added public web A record resolves to49.12.84.228, with no AAAA; MX10mx.mailgt.dev is preserved. The existing Caddy host returns200 with valid HTTPS when reached directly at the edge. The VM-to-public-IP connection times out. The operator subsequently confirmed that both newsletter and Addy pages open in an outside browser; the private-to-public return path is the remaining VM-specific limitation.

The native receiver accepts only this instance's existing feed addresses. It is not an outbound SMTP relay. WebSub callback registration is blocked because it would introduce user-selected server outbound requests. All new outbound traffic from its dedicated networks is denied, including DNS; native local receiver operation was verified without external lookups. The private self-signed SMTP staging certificate is not suitable for a public service.

App workers: each0.5CPU/192MiB, gateway0.25CPU/64MiB; no added capabilities, read-only roots, bounded processes and temporary storage. Gateway access logging is off, with warning/error logs retained. Docker logs rotate at1MiB×2 per container, a size policy rather than a time duration. Native receipt diagnostics include sender and feed/entry identifiers. These are operational metadata, not visitor analytics.

`operator-copy.patch` uses the configured operator email for the native issue links, adds equivalent English/Spanish introduction and ordinary portal/privacy links, and replaces the absolute upstream tracking claim with the actual analytics/log distinction. It changes no mail, feed or authentication code. All fonts/icons/scripts are served locally. Gateway CSP prevents remote-image requests in the native HTML viewer; the exported Atom content can retain external image/link references, and a third-party feed reader may fetch them.

## Native data and user guide facts

EN: Enter a title and choose **Create feed**. Keep both the generated email address and Atom URL private. Subscribe to a newsletter with that address and open its Atom URL in a feed reader. A newsletter confirmation link appears as a feed item. This tool cannot send a confirmation reply on your behalf. The Atom URL is a bearer link: its holder can read mail and discover the management URL, change settings or delete the feed. It is not an encrypted mailbox or a general temporary-email reply service.

ES: Ingresá un título y elegí **Create feed**. Conservá en privado la dirección de correo y la URL Atom generadas. Suscribite a un boletín con esa dirección y abrí su URL Atom en un lector. El enlace de confirmación del boletín aparece como una entrada. La herramienta no puede responder un correo de confirmación por vos. La URL Atom da acceso a quien la tenga: permite leer mensajes y descubrir la URL de gestión, cambiar ajustes o borrar el canal. No es un buzón cifrado ni un servicio general para responder correos temporales.

Mail bodies, subjects, senders and attachment metadata/files are processed and stored by the server in readable form. Native incoming message size limit is512KiB. Native cleanup runs hourly and removes entries older than30days; receipt of new mail can remove older entries earlier to keep feed content near512KiB. Unlinked enclosure files are removed by the native cleanup job. Feed settings/identifiers have no automatic expiry. No shorter retention was imposed to rescue a privacy sentence.

The Atom XML feed is a readable export of **currently retained entries**, not an archive of all received mail. Attachment URLs in the feed are not embedded independent copies; download wanted attachments separately before expiry. A feed reader can subscribe to the URL, but this release has no native XML import restoring server history/settings. No unperformed reader import is claimed.

EN deletion: Open the **Kill the Newsletter! feed settings** link at the end of an entry. Under **Delete feed**, enter the exact feed title in **Feed title confirmation**, then choose **Delete feed**. Unsubscribe from the original newsletter separately and remove the feed from your reader. Other readers/downloaded copies and backups are unaffected.

ES borrado: Abrí **Kill the Newsletter! feed settings** al final de una entrada. En **Delete feed**, escribí el título exacto en **Feed title confirmation** y elegí **Delete feed**. Cancelá por separado la suscripción al boletín original y quitá el canal de tu lector. No se borran las copias de otros lectores, las descargas ni las copias de seguridad.

## Verification and recovery

`check.mjs` created a disposable native feed, sent a fictional message solely through local SMTP, checked its subject/body in the resulting Atom XML, performed an isolated SQLite/files/private-configuration restore, and deleted the feed through its native confirmation control. The deleted feed returned404. The browser issued no requests to other hosts. All earlier fixtures with the same exact fictional title were also removed through native controls; no real data was touched. The test transport intercepts canonical HTTPS to the loopback listener and explicitly follows the native create response's location; this is not a real public-HTTPS or external-mail delivery check.

The SQLite native backup API and archive extraction/integrity checks run daily06:20UTC plus up to10minutes. Backup files have **no automatic expiry**, remain on this VM and are not off-site; active deletion does not alter old backups. Backups refuse to run when less than5GiB is free. A text-only mail restore does not prove an atomic database/attachment snapshot during concurrent mail receipt. Private evidence is under `/opt/utilibre/reports/newsletters-20261009`.

## Remaining external activation checks

- The operator configured the existing Proxmox gateway10.10.1.20 to route newsletters.utilibre.org to10.10.1.43:2526. Both authoritative nameservers returned MX10mx.mailgt.dev at02:24UTC. The root MX was preserved; this worker made no DNS changes.
- The operator's controlled external receive test produced the expected feed-entry title at02:28:30UTC. This proves that tested receive path; it does not prove every sender's delivery or a public web workflow. No message body was inspected for this routing check.
- The web DNS record is present, and the operator confirmed outside-browser access. The existing Caddy block routes to10.10.1.43:3210 and returned200 through the edge. This hostname is DNS-only; its MX points at the separate mail gateway.
- Verify the mail edge's external inbound TLS, limits and abuse controls separately. The application's self-signed SMTP certificate remains internal; it is not a claim of a publicly trusted SMTP certificate.
- Native create/delete and deleted-feed404 passed over Caddy HTTPS with a disposable feed. The operator separately verified external page access and controlled received mail; this was not one automated outside-VM end-to-end test. No further mail tests were sent.

### Web boundary and rollback

`firewall.sh` adds one LAN/source-scoped PREROUTING rule from10.10.1.3 to10.10.1.43:3210, forwarding to the fixed ingress address172.29.140.10:8080. Its existing DOCKER-USER chain permits only that edge source/interface to the web port. Unrelated-container and host-private-IP connection attempts were denied; loopback administration and direct edge HTTPS returned200. Both native web and gateway PIDs/start times stayed unchanged. Evidence: `/opt/utilibre/reports/newsletters-web-20261009/results.json` and `edge-headers.txt`. No real feed, SMTP listener, app worker or backup was modified for this change.

The existing firewall/startup units reapply the rule after Docker starts. To remove only the web LAN route, delete the exact DNAT rule with `iptables -w -t nat -D PREROUTING -i eth0 -s 10.10.1.3 -d 10.10.1.43 -p tcp --dport 3210 -j DNAT --to-destination 172.29.140.10:8080` and remove its corresponding line from `firewall.sh`. Keep the restrictive filter rules and all SMTP rules intact; localhost administration remains available.

## Private SMTP activation update

See [exact Proxmox transports and DNS handoff](../deployment/mail-routing/proxmox-transports.md). Earlier local/private-IP EHLO checks passed before the stricter policy. Current host and SMTP-container rules permit only the gateway source; VM loopback/private-IP attempts and other containers were denied. Native container loopback port 25 remains usable. A one-use FIFO permit prevents the SMTP process from opening before namespace rules are installed. `utilibre-newsletters-smtp.service` supervises the native receiver with Docker restart disabled and reinstalls restrictions before allowing gateway access. This worker did not originate a test from the separate Proxmox VM. The operator subsequently confirmed the controlled receive flow, as recorded above. Evidence: `/opt/utilibre/reports/mail-relay-20261009/`. No backup expiry or retention was changed.

Strict source-policy verification: `/opt/utilibre/reports/mail-strict-source-20261009/boundary.json` and `dns-authoritative.json`. At 02:24 UTC both authoritative nameservers returned the dedicated MX pointing to `mx.mailgt.dev`; no DNS was changed by this worker. No SMTP DATA or remote-gateway-originated test was performed. Older `check.mjs` loopback SMTP instructions describe the isolated staging test and must not be used to reopen host access.

## Native wording follow-up at 03:04 UTC

The p2 web build corrects the formerly absolute upstream “doesn’t track users in any way” statement. English and Spanish now distinguish absent visitor analytics from receipt logs and remote content a feed reader may fetch. Both portal/privacy links have localized targets. The Spanish introduction uses voseo and says the upstream interface is English. The earlier record described this correction prematurely; the application source and deployed page were checked for this follow-up.

A native SQLite/files backup completed before deployment. Only web and its namespace-sharing gateway were recreated; SMTP and jobs kept their previous container IDs/start times. Native TypeScript/build checks passed. A 375-pixel Chromium page had no horizontal overflow and made no external requests. A newly created fictional feed was deleted through the native confirmation form and subsequently returned 404. This browser used direct Caddy HTTPS with the correct hostname and trusted certificate; it does not prove public-IP reachability. No mail was sent. Evidence: `/opt/utilibre/reports/native-followup-20261009/newsletters-copy-results.json` and `newsletters-before.txt`.

Rollback: set only the web image back to `utilibre-newsletters:2.1.3-p1`, then run `docker compose -f deployment/newsletters/compose.yaml up -d --no-deps web gateway`. Do not recreate SMTP, initialize the database, change firewall source restrictions or restore data for a copy rollback. The rebuild helper checks the immutable upstream pin and rejects an unexpected patch state before building.

Cloudflare API verification confirmed the explicit newsletter and alias A records are DNS-only; the root and shared wildcard A records are HTTP-proxied. The token can read these DNS records but cannot inspect zone settings/rules. The operator subsequently confirmed outside-browser access; no proxy-mode, provider or mail-route change was made to bypass that check.

The portal readiness request uses the canonical HTTPS newsletter URL with a container-local host mapping to the existing Caddy edge, retaining TLS hostname validation. This avoids the VM's failing public-IP return path without changing public DNS or broadening app-network access. It checks the Caddy/application HTTP path, not outside mail delivery.
