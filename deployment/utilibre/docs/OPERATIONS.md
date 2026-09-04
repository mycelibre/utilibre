# Operations

## Daily checks

```sh
cd /opt/utilibre
./scripts/status.sh
./scripts/healthcheck.sh
docker compose logs --tail=100 freshrss rsshub privatebin
```

The health script verifies all five containers, the two private HTTP services,
FreshRSS-to-RSSHub reachability, Valkey, the exact FreshRSS database set, host
headroom, and backup freshness.

## Service control

```sh
docker compose stop freshrss
docker compose up -d freshrss
docker compose restart rsshub
docker compose logs --tail=100 rsshub
```

Do not publish RSSHub to diagnose it. Use its container health or test from
FreshRSS on the backend network. A FreshRSS subscription may reference an
approved RSSHub route as `http://rsshub:1200/<route>`.

## Accounts and retention

Keep FreshRSS self-registration closed and issue accounts through the
operator's reviewed request process. Use modest quotas without intrusive
identity checks, and give users export/deletion and advance retirement
guidance. PrivateBin is ancillary and retains encrypted payloads only according
to `config/privatebin/conf.php`.

`scripts/bootstrap-freshrss.sh` is for first installation and idempotent
verification of the generated operator account. A rerun does not rotate its
password, change its settings, replace the default user, or repair ambiguous
partial state. Use FreshRSS's documented account commands for an intentional
credential rotation, then update the root-only credential record in the same
maintenance window.

## Incidents

- Stop only the affected service first.
- Preserve logs and durable data when an incident may involve user records.
- If RSSHub is abused through a feed route, remove that subscription or stop
  RSSHub; never make its listener public.
- If FreshRSS or PrivateBin cannot be operated safely, remove its edge route
  before extended investigation.
- Restore only after a rehearsal and run the full health script afterward.
