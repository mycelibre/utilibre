# Source and image manifest

The deployment uses unmodified upstream images pinned by immutable digest. No
locally derived application image remains in this Compose project.

| Service | Deployed image | Corresponding source | License |
|---|---|---|---|
| PostgreSQL | `postgres:17.11-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73` | <https://github.com/postgres/postgres/tree/REL_17_11> | PostgreSQL |
| Valkey | `valkey:9.1.1-alpine@sha256:de31910896150d5e754a07d57d227cfdde4e258ddd0d1aa4607f2d2f95843715` | <https://github.com/valkey-io/valkey/tree/9.1.1> | BSD-3-Clause |
| FreshRSS | `freshrss/freshrss:1.29.1@sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d` | <https://github.com/FreshRSS/FreshRSS/tree/1.29.1> | AGPL-3.0 |
| RSSHub | `ghcr.io/diygod/rsshub@sha256:0e0ee34e7288664ada039a816835ee28cc86767412d2c23f64e37a7320908f6c` | <https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95> | AGPL-3.0 (upstream declaration) |
| PrivateBin | `privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8` | <https://github.com/PrivateBin/PrivateBin/tree/2.0.6> | Zlib |

Deployment glue consists of `compose.yaml`, the PostgreSQL initialization
script, the PrivateBin configuration, and operator scripts/docs. The retained
RSSHub image is upstream and no longer includes Utilibre's former public-origin
patch.
