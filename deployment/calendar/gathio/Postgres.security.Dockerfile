# Runtime security refresh; preserve PostgreSQL 17.11 and every installed
# extension exactly. No schema/major-version upgrade is part of this change.
FROM utilibre-gathio-documentdb:17.11-0.107.0
USER root
RUN dpkg-query -W -f='${db:Status-Status} ${Package}\n' 'postgresql*' 'libpq*' \
 | awk '$1 == "installed" {print $2}' | xargs apt-mark hold \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends upgrade \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
