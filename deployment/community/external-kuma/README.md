# Utilibre checks on an outside Uptime Kuma VM

Uptime Kuma 2.5.x does **not** load monitor definitions from a YAML/JSON config
file. Version 2 removed its old JSON backup/import function. `targets.json` is a
reviewable inventory, and `apply.py` is a one-time importer using the same local
Socket.IO management interface already used by Utilibre's internal Kuma scripts.
No companion service or scheduler remains running after import. This does not use
GitHub for checks or status hosting.

The current inventory covers all 106 enabled catalogue service IDs with 89
distinct application HTTPS endpoints, the portal health and homepage endpoints,
and one Mumble TCP listener: **92 checks**. Shared application URLs are checked
once. Normal application checks run every 10 minutes, SearXNG and the portal
homepage every 5 minutes, and portal health every 2 minutes. Each new monitor
has two retries, a 20-second timeout, and **no notification**. The importer
creates or extends only the `utilibre` public status page. It preserves existing
monitors, notification settings, status pages for other websites, and history.
Running it again reuses matching endpoints. It never deletes monitors.

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

If Caddy runs on the outside VM, its site block is:

```caddyfile
status.utilibre.org {
    redir / /status/utilibre 308
    reverse_proxy 127.0.0.1:3001
}
```

On the currently selected outside VM, Nextcloud AIO already binds public TCP
443 through its Apache container. Do **not** start a second Caddy listener on
443 or edit the generated AIO Apache container to fit Kuma. Nextcloud AIO has
a documented reverse-proxy mode, but changing that deployment is a separate
maintenance operation; the observed AIO mastercontainer restart loop must be
resolved first. Until a supported HTTPS route exists, keep the existing
Utilibre status hostname on its original server and keep Kuma's new page
private, with administration over an SSH tunnel.

Caddy's reverse proxy handles Kuma's WebSocket connection. Do not add access
logging for this host. After the `utilibre` page exists, point the hostname's A
record to the outside VM and open HTTPS (and HTTP for certificate issuance) in
the VM and provider firewalls. A DNS-only record keeps the status page reachable
if the main site's HTTP proxy is down. Confirm the public HTTPS page and API
return 200 before removing the existing same-server status route. Then remove
public ingress to TCP 3001 at the provider and VM firewall; verify that
`ss -ltnp` shows Kuma listening on `127.0.0.1:3001`, and that a request to the
outside VM's public IP on port 3001 fails. The page slug is `utilibre`; there is
no need to create a duplicate `default` page or attach monitors by hand.

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
[status pages](https://github.com/louislam/uptime-kuma/wiki/Status-Page).
