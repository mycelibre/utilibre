# Utilibre checks on an outside Uptime Kuma VM

Uptime Kuma 2.5.x does **not** load monitor definitions from a YAML/JSON config
file. Version 2 removed its old JSON backup/import function. `targets.json` is a
reviewable inventory, and `apply.py` is a one-time importer using the same local
Socket.IO management interface already used by Utilibre's internal Kuma scripts.
No companion service or scheduler remains running after import. This does not use
GitHub for checks or status hosting.

The current inventory covers all 109 enabled catalogue service IDs with 92
distinct application HTTPS endpoints, the portal health and homepage endpoints,
and one Mumble TCP listener: **95 checks**. Shared application URLs are checked
once. Normal application checks run every 10 minutes, SearXNG and the portal
homepage every 5 minutes, and portal health every 2 minutes. Each new monitor
has two retries, a 20-second timeout, and **no notification**. The importer
creates or extends only the `utilibre` public status page. It preserves existing
monitors, notification settings, status pages for other websites, and history.
Running it again reuses matching endpoints. It never deletes monitors.
GotHub's public root has a Cloudflare browser challenge; its native
`/api/v1/version` route is explicitly exempt and returned HTTP 200 from this
outside VM. The inventory checks that route. The importer permits only the
reviewed GotHub root-to-version URL migration, preserving its monitor ID; it
rejects a different old URL or attached notifications for operator review.
`--check` reports the pending change as `wouldUpdate`, while `--apply` reports
it as `updated`. Other changed endpoints still fail on a name collision.

## Prepare on the outside VM

Copy `targets.json` and `apply.py` to a private directory on that VM. Its only
runtime requirements are Python 3 and either the local Docker CLI or Node in a
native Uptime Kuma 2.5.x installation. No passwords belong in the inventory.

Find the container name if Docker is in use:

```sh
docker ps --format '{{.Names}}  {{.Image}}' | grep -i kuma
```

Then inspect the inventory, compare it without changes, and apply it:

```sh
python3 apply.py
python3 apply.py --check --container YOUR_KUMA_CONTAINER
python3 apply.py --apply --container YOUR_KUMA_CONTAINER
```

For a native installation, replace `--container ...` with `--app-dir` pointing
to the Uptime Kuma application directory. The importer asks for the admin
username and password locally, without echoing the password. It passes them to
the local Uptime Kuma process through stdin, not command arguments or a file.
For unattended local operation, `--credentials-file /private/path.json` accepts
an owner-only (mode 0600) JSON file with `username` and `password`; keep it out
of the repository and backups sent to others. This is a one-shot operation, so
interactive entry is preferred.

The final JSON line reports `added`, `reused`, `missing`, and `paused`. `--check`
must report 92 targets. After `--apply`, it should report 92 `added + reused`
and zero `missing`; inspect `/status/utilibre` on the outside VM and wait for at
least one check cycle. Configure a single alert after results settle, rather
than attaching an email notification to every monitor immediately. Map a
public status hostname to the **outside** VM only after its HTTPS route works;
do not proxy that hostname through the Utilibre VM.

## Publish from the outside VM

Keep port 3001 private. A direct public `http://SERVER:3001` route exposes the
Kuma login over plaintext HTTP. On a native installation, the supported
`UPTIME_KUMA_HOST=127.0.0.1` setting in the application `.env` makes Kuma listen
only on loopback. Identify its actual process supervisor before restarting it;
do not assume Docker or systemd. Use a local SSH tunnel for administration until
the HTTPS route is ready.

The selected outside VM runs Kuma under PM2 as process `uptime-kuma`. The
reviewed loopback operation is
`UPTIME_KUMA_HOST=127.0.0.1 pm2 restart uptime-kuma --update-env`, followed by
`pm2 save` and a check that `ss -ltnp` shows `127.0.0.1:3001`. Check public
reachability from another host too. The process environment must be persisted
before a reboot; an application `.env` setting is an additional supported way
to keep the same binding.

The selected outside VM now has Nginx serving `valoracion.xyz` and proxying
Nextcloud AIO to `127.0.0.1:11000`. Keep that site intact. Add a **separate**
`status.utilibre.org` Nginx site that proxies only Kuma's public status routes
to `127.0.0.1:3001`. Reuse the tested path allowlist from
`deployment/community/gateway.conf`; do not publish Kuma's dashboard, setup,
administrative WebSocket or login routes. Set `access_log off` in the status
site; the Nginx global default currently enables request logging.

First prepare an HTTP site and test it against the outside IP with `curl
--resolve` while public DNS still points to the existing status service. The
site must return 200 for `/status/utilibre` and its status-page API, and 404
for `/dashboard` and `/setup`. Create
`/var/www/letsencrypt/.well-known/acme-challenge` before activating the site.
The reviewed site file is `nginx-public-status.conf`. It uses short, explicit
locations because a pasted long regular expression was wrapped and failed
`nginx -t` on the selected VM. It passed an isolated Nginx syntax check; run
`nginx -t` against the actual server before reloading it. Do not overwrite
Nextcloud's `valoracion.xyz` site or its certificate.

For this VM, Certbot 1.21.0 is installed and the HTTP webroot challenge is the
smallest renewable option. After the direct HTTP route passes, create the
DNS-only record and wait for it to resolve to the outside VM. Then run
`certbot certonly --webroot -w /var/www/letsencrypt -d status.utilibre.org
--cert-name status.utilibre.org`. Inspect the resulting certificate name and
paths before installing `nginx-public-status-tls.conf` in place of the HTTP
site. The TLS file keeps the webroot challenge on HTTP for renewals, redirects
other HTTP requests to HTTPS, and serves only the public Kuma routes over
HTTPS. Check `nginx -t`, reload Nginx, inspect the certificate and page/API,
and run `certbot renew --dry-run` to test renewal. The selected VM had no
Certbot deploy hook, so install `certbot-nginx-deploy-hook.sh` with executable
mode in `/etc/letsencrypt/renewal-hooks/deploy/`. It tests and reloads Nginx
after a successful renewal, including the existing Nextcloud certificate.
Run the hook once manually after installation and verify both HTTPS sites.
Keep the old status service available until the new public route passes.

On 23 November 2026 the explicit DNS-only A record for `status.utilibre.org`
points to the outside VM (`132.145.156.141`). Its valid certificate expires on
21 February 2027; Certbot 1.21.0's renewal dry run passed, and the reviewed
deploy hook reloads Nginx after successful renewal. Public HTTPS
`/status/utilibre` and its status-page API returned 200 with 92 monitors in six
groups; `/dashboard`, `/setup`, and the administrative socket returned 404.
Nextcloud's separate HTTPS host still worked, and Kuma listened only on
`127.0.0.1:3001`. The page slug is `utilibre`, without a duplicate `default`
page. Preserve the previous same-server status service for a DNS rollback until
its retirement is separately reviewed. The external page does not depend on
the Utilibre VM's HTTP proxy.

Keep the portal's existing language-specific status pages until their links and
data-handling description are updated to reflect the outside monitor. They
measure a different, same-server path. If anyone used the login over direct
HTTP, change that admin password over HTTPS and enable Kuma's native two-factor
authentication.

## Scope and limits

These are public, synthetic GET/TCP checks. They send no user files, search
terms, credentials, or task data. They verify reachability and simple responses,
not complete workflows: a login screen can respond while an account feature is
broken, and a PDF homepage can respond while an export fails. The Mumble check
tests TCP 64738, not UDP audio. Internal databases, private-only services and
the VM's disk/RAM require local monitoring; the outside VM cannot safely probe
them through public routes. A 403 or 429 from the outside VM can indicate a
firewall/rate-limit rule instead of a dead service; inspect that exact endpoint
before changing any rule. Do not use a broad bypass.

To refresh the inventory deliberately from the current public catalogue and
public portal configuration, run on a Utilibre checkout with Node 24:

```sh
node --experimental-strip-types deployment/community/external-kuma/generate.mjs --live
```

Review the diff, especially new URLs and status labels, before copying the new
file to the outside VM. This command makes one request to Utilibre's public
`/_portal/config`; it does not contact third-party services or change Kuma.

Rollback: the importer adds monitors but does not alter service deployments.
Remove just the imported `Utilibre ·` monitors and the `utilibre` status page
through Kuma's UI if the new checks are unwanted. Existing Kuma history for
other websites remains untouched. Before any database-level restore, back up
the outside Kuma data directory using its established backup procedure.

References: [Uptime Kuma 2 migration](https://github.com/louislam/uptime-kuma/wiki/Migration-From-v1-To-v2),
[status pages](https://github.com/louislam/uptime-kuma/wiki/Status-Page),
[Kuma reverse proxy](https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy),
[Nextcloud AIO reverse proxy](https://github.com/nextcloud/all-in-one/blob/main/reverse-proxy.md),
[Certbot 1.21 renewal hooks](https://github.com/certbot/certbot/blob/v1.21.0/certbot/docs/using.rst#pre-and-post-validation-hooks).
