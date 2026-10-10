# Keep the matching DocumentDB extension; apply current upstream PostgreSQL minor fixes.
FROM ghcr.io/ferretdb/postgres-documentdb:17-0.107.0-ferretdb-2.7.0@sha256:2386795ec2aa7ae559304361979f1dc5708d383ee9020ae63dadc2940dfe58f7
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-17=17.11-1.pgdg12+2 postgresql-client-17=17.11-1.pgdg12+2 libpq5=18.6-1.pgdg12+2 && rm -rf /var/lib/apt/lists/*
