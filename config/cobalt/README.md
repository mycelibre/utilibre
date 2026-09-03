# Cobalt configuration

The API uses the official image without source or frontend modifications. `compose.yaml` requires API-key authentication, disables wildcard CORS, sets a 30-minute duration target, and keeps the API on the private bind address.

Run `node scripts/init-secrets.mjs` to create a matching UUID key in `secrets/cobalt-keys.json` and `secrets/portal-cobalt-key`. Never use the placeholder in `keys.example.json`.

No cookie file, account token, Redis service, or persistent media volume is configured.
