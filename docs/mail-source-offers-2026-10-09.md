# Mail source offers, 9 October 2026

Published through the existing read-only `/utilibre-source/` endpoint. These source downloads do not publish the mail applications in the portal catalog or change their access gates. In particular, SimpleLogin remains blocked from public deployment by the dependency findings in its service record.

## Downloaded source

| Application | Installed source | Archive | SHA-256 | Bytes |
| --- | --- | --- | --- | --- |
| newsletters | 2.1.3-p2 (web; SMTP/jobs p1) (`c2d7cf8f7d9927fd19a36ea9beaf0ced67afcefc`) | [Source and recipes](https://tools.utilibre.org/utilibre-source/newsletters-utilibre.tar.gz?revision=ffe81e3bb844) | `ffe81e3bb84433be3172f508fbc01c354e2caf80751b1391e1b117a4b140c2f1` | 87873 |
| addy | 1.7.3 (`150983e3331e80bb72b619984dc5e3f5390ddb93`) | [Source and recipes](https://tools.utilibre.org/utilibre-source/addy-utilibre.tar.gz?revision=cb14bb44359e) | `cb14bb44359ea73c9c798764bc0240c9c3e2cb2fba3328dc5c0e21ec736e35dc` | 1006097 |
| simplelogin | 4.82.4-p7 (`995904d5bc08ff5f951ad794b9372cbeb04d5fb6`) | [Source and recipes](https://tools.utilibre.org/utilibre-source/simplelogin-utilibre.tar.gz?revision=722a7a28b47e) | `722a7a28b47eb14beee789d589ee6a5d12d4548b20bca3baf7fef72fc8c0d9c0` | 7286302 |

Each archive contains the pinned application source, original licences/notices, matching deployment recipes, `SOURCE-NOTICE.txt` and a per-file SHA-256 `SOURCE-MANIFEST.json`. Included recipes cover resource/logging ceilings, backup procedures, the narrow relay connection and final SMTP source restrictions. Newsletter/Addy include both `smtp-entrypoint.sh` and `start-smtp.sh`: the native process waits for the one-use FIFO permit until namespace restrictions are installed. The Addy gateway configuration includes its existing Caddy-edge-only private listener. Newsletter integration includes the final edge-only HTTP DNAT/forwarding rule without changing its native loopback publication or restarting its real feed. No SMTP restriction was changed by packaging.

- Newsletter source includes the exact deployed `operator-copy.patch` changes. The packaged application source matches the reviewed working source byte-for-byte. The archive includes the pinned Node Docker recipe; the p2 web image was rebuilt and checked with its native create/delete flow; receiver/jobs remain on p1.
- Addy application source is unchanged at its recorded commit. The upstream Docker recipe at `ec7934b4835518fe6a520dedf7ce97464cacd7cd` is included separately under `upstream-docker/`. Its licence is MIT; the application explicitly declares `AGPL-3.0-or-later` in its pinned composer.json. This supported scope replaces the earlier unconfirmed label; the original legal texts are preserved.
- SimpleLogin source has the exact three-line native STARTTLS fix plus DEBUG-to-WARNING logger and pinned Gunicorn dependency declaration changes already applied. It includes both patches, the layered Dockerfile, the pinned base-image digest and the p6 `compatible-leaves.txt` wheel hashes. Those eight transitive upgrades preserve the native application constraints and pass the isolated native regression. SHA-256 of both modified Python files matches the running private web container. This does not repair its broader dependency findings or establish external mail delivery.

## Privacy and source hygiene

Packaging starts from `git archive` at each immutable commit. It does not traverse `/opt/utilibre/<service>/data`, private configuration, backups, operator feeds, queues, browser sessions or generated QA credentials. Integration files are copied only from the three reviewed deployment directories and `deployment/mail-routing`. The two `relay.env` files contain only nonsecret transport and native authentication configuration. The original 54 authored mail/routing files were scanned before adding the publisher; the publisher then rescanned all archived contents and rejected private-key material and token patterns.

Five public upstream development/test private-key fixture files are deliberately omitted and named in each manifest/notice: Addy's `tests/keys/TestDkimSigningKey` and SimpleLogin's `local_data/dkim.key`, `local_data/jwtRS256.key`, `local_data/key.pem`, `local_data/private-pgp.asc`. They are not needed to build the application and must not be reused for deployment. All other tracked application source files are included, with the documented modifications. Original public fixture provenance remains identified by the upstream commits. Runtime mail-signing, TLS and application keys are never read or included.

## Reproduction and verification

Run `python3 deployment/mail-routing/publish-source.py` from the checked repository after reviewing any new integration files. It validates each source HEAD against the pinned commit, extracts tracked source without links/path traversal, applies checked patches to an isolated staging directory, scans contents, validates the tar and atomically publishes it. Existing published archives, if any, are copied into the new private staging directory before replacement. No backup retention or user data is touched. Since tar/gzip metadata can differ across runs, use the recorded manifest to compare individual source files.

Verification on 9 October 2026:

- Upstream commit checks and patch applicability passed.
- All archived entries are regular files/directories with safe relative paths; no symlinks or runtime directories are included.
- Three final public HTTPS downloads using curl, with a content-hash revision query to avoid stale CDN cache entries, matched their published SHA-256 values, and every file in every source manifest matched after reading the downloaded archive. A Python urllib request was denied with HTTP 403 by the edge; standard curl requests succeeded without weakening any protection.
- Native SimpleLogin TLS/logging source hashes match the private running container. No container, network or service restart occurred.
- Publisher syntax passed without creating bytecode files in the deployment directory.
- No SMTP DATA, external message, real account creation, feed read, user-data deletion or backup pruning was performed in this task.

Private detailed evidence: `/opt/utilibre/mail-source-o4x_4up5/published.json` and `public-verification.json`. The parent linked these archives from the existing bilingual source index; no new public application card is implied.

Final refresh after the mail-routing record was reconciled: `/opt/utilibre/mail-source-299cfkm9/published.json`. The URLs above use the refreshed SHA prefixes; no further mail runtime change was made.

Native2 refresh: `/opt/utilibre/mail-source-4wk1eqd8/published.json`. It includes newsletter p2 bilingual notes and private SimpleLogin p5 transport maintenance. Public catalog launch and native mail delivery are separate from source publication.

Private p6/precise-licence refresh: `/opt/utilibre/mail-source-t0a_uxf7/published.json` and `public-verification.json`. All three public HTTPS archives and every manifest file were verified again. SimpleLogin source hashes match the deployed private p6 image; the source offer does not lift its public gate. The scoped p6 service replacement is described in its deployment record; packaging itself made no runtime change. The current URLs and hashes are the table above.

Addy authentication refresh: the current archive includes native Postfix header scrubbing, the authentication-only Rspamd configuration, its isolated seven-case checker and the reconciled routing record. Application source is unchanged. Forward and reply receipt are owner-confirmed; the forwarded message passed SPF/DKIM/DMARC with the existing PMG signer. Packaging changed no runtime keys, messages or backup retention. Detailed publication evidence: `/opt/utilibre/reports/addy-forward-20261009/source-published-final.json`.

SimpleLogin p7 runtime refresh: `/opt/utilibre/reports/simplelogin-runtime-20261009/source-publication.json`. The current archive includes the 33 hash-pinned runtime packages, nine direct dependency changes and the extended isolated native checks. Published application and metadata files match the deployed image; no legacy framework fix or public activation is implied. Existing source archive is retained in the publisher's private staging directory.
