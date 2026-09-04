# Resource limits

| Service | Memory limit | CPU limit | PID limit | Main risk |
|---|---:|---:|---:|---|
| PostgreSQL | 2 GiB | 2.0 | 256 | database growth and connection pressure |
| RSSHub | 1.5 GiB | 1.5 | 256 | slow or abusive upstream routes |
| FreshRSS | 1 GiB | 1.0 | 256 | feed refresh bursts and stored articles |
| Valkey | 384 MiB | 0.5 | 100 | disposable cache churn |
| PrivateBin | 384 MiB | 0.5 | 128 | anonymous paste/storage abuse |

The configured ceiling is about 5.3 GiB, excluding tmpfs and Docker overhead.
RSSHub and Valkey are internal; their traffic should originate only from the
retained application flow. Monitor container memory, PostgreSQL/data directory
growth, and outbound traffic. Stop RSSHub if a route creates sustained CPU,
memory, or upstream-request pressure.

```sh
docker stats --no-stream
du -xsh /opt/utilibre/data/postgres /opt/utilibre/data/freshrss \
  /opt/utilibre/data/privatebin /opt/utilibre/data/backups
df -h /opt/utilibre
```
