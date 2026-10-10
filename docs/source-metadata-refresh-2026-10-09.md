# Source-offer metadata refresh, 9 October 2026

AutoRedact and La Suite Projects source offers now include the reviewed licence
descriptions from [the declared-metadata correction](license-review.md#declared-metadata-correction-9-october).
No application was rebuilt, restarted or relicensed. The original licence files
and package declarations are unchanged.

| Source offer | SHA-256 | Bytes |
| --- | --- | --- |
| [AutoRedact 2.1.3-p1](https://tools.utilibre.org/utilibre-source/autoredact-utilibre.tar.gz?revision=0bb53bb4dd02) | `0bb53bb4dd02ca96948b8e12a7d8673127c42860e37e0ed69965751d774ab70d` | 4,678,994 |
| [La Suite Projects 1.3.0-455aa274-p2](https://tools.utilibre.org/utilibre-source/projects-utilibre.tar.gz?revision=7045e290473c) | `7045e290473c5d6decde9bfeeff41fe7e7066ff01a25aba2c6359cad20cf6e81` | 4,009,324 |

AutoRedact's existing publisher now writes the corrected `GPL-3.0-only`
description in its build note and includes the updated integration README.
All 77 upstream files and six dependency notices match the previous offer byte
for byte. All eight packaged integration files match their current recipes.

Projects' existing publisher preserves a previous archive by hash before
atomically replacing it, includes the licence-review evidence, and packages the
already-reviewed public workflow checker and scoped fixture-retirement update.
All 978 upstream files match the previous offer. All 33 manifest entries match
both the packaged bytes and their current repository files. The recorded image
remains `sha256:03854cd788d29d27484d825ff69e92e778abd97a2e9328f9dd99f8959f3bfc15`.

Both revision-specific HTTPS downloads returned successfully and matched the
origin archive hashes. Paths were checked for absolute/traversal entries and
duplicate names. The integration contents include no runtime environment files
or private state. Prior archives remain preserved under the private
`/opt/utilibre/reports/source-license-refresh-20261009` directory; Projects also
preserves its prior offer through the publisher's existing report directory.
Detailed comparison results are in `verified-archives.json` in that private
report directory. The two source-index entries use the new revision queries to
avoid serving older cached metadata; central index publication is separate.
