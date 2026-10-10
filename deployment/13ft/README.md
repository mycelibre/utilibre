# Public-page reader

Use the scoped `utilibre-13ft.service`; it installs independent namespace OUTPUT policies before exposing the reader. Never deploy with raw Compose alone. The reviewed Compose file binds both loopback and `10.10.1.43:3207` for the existing Caddy edge. A fresh staging copy must bind loopback only until its checks pass.

`rebuild.sh` reconstructs the pinned native application and `Dockerfile.proxy` the pinned Squid 7.7 proxy. `public-reader.patch` is small/reversible and independent of the older, unchanged fixture-only pilot.

## Verification

- `docker exec -i utilibre-13ft-app-1 python - < deployment/13ft/check-fetch.py` checks native validation/body/deadline/routes using fictional mock responses only.
- `docker exec -i utilibre-13ft-app-1 python - < deployment/13ft/check-boundary.py` checks actual blocked destinations and direct-egress denial. It does not fetch real user data.
- `node deployment/13ft/check-browser.mjs PRIVATE_REPORT_DIRECTORY` opens the native form in EN/ES and reads the owned fictional source under `https://tools.utilibre.org/utilibre-source/reader-fictional-20261009.html`. Set `READER_ORIGIN` for the ready canonical host.
- `check-dns.py` and `check-dns-boundary.py` preserve the controlled DNS test used during loopback-only staging. Run them only on an isolated staging copy **before** installing final namespace OUTPUT rules, not against an exposed reader. The DNS fixture binds proxy-loopback UDP 53; its `/tmp/utilibre-dns-mode` JSON specifies `mode` and the owned public fixture IP. Temporarily set Squid `dns_nameservers 127.0.0.1`, `positive_dns_ttl 1 seconds`, `negative_dns_ttl 1 seconds`; save the exact final configuration as `squid-final.conf` in the private report directory. The driver toggles fictional test-domain A answers, records public/private/mixed results and restores the saved config. Shut down the fixture and restart through the scoped service before exposure. Private AAAA was not queried because IPv6 is disabled; do not call that a tested AAAA-denial result.

See `docs/13ft-deployment-2026-10-09.md` for processing, provider, retention, measured scope and recovery details. No persistent article state or user account exists in this deployment.
