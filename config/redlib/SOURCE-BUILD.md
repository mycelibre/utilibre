# Matching source: Redlib e48efd8 / Utilibre 1

This archive contains the modified application under `redlib/`, all locked
Cargo dependencies with their notices under `vendor/`, and Utilibre's recipes
and ordered patches under `integration/redlib/`. The recipe identifies the
unmodified upstream archive and both input and output hashes. The application
is AGPL-3.0-only; dependencies retain their own licenses.

The `redlib/` directory is already patched. Do not apply the patches again.
To build its binary offline, use Rust 1.98.0 with the native build prerequisites
from the Dockerfile (C/C++ toolchain, cmake and libclang):

```sh
cd redlib
export REDLIB_BUILD_REVISION=e48efd85c4527b211f1219bdcbfda72ada6d4ec6
cargo test --offline --locked --lib gql::tests
cargo test --offline --locked --lib shreddit::tests
cargo test --offline --locked --lib redirect_tests
cargo build --offline --locked --release --bin redlib
```

The bundled `.cargo/config.toml` selects `../vendor`; do not resolve newer
packages during replay. Upstream's broader test suite includes live requests,
so the commands above deliberately select offline modules. No private probe,
credentials, runtime state, or private reports are included.

For a clean reconstruction use the checksum-verified upstream archive with
`integration/redlib/prepare-source.mjs`. Its exact archive/patch/output checks
are separate from behavioral and deployment approval.

The production runtime is the exact maintained predecessor in `recipe.json`
plus the replacement executable. `Dockerfile.runtime` preserves its layers,
user and command. Native runtime repair sources remain available alongside
this archive in Utilibre's source directory; its Ubuntu mount-library source
offer is `security-noble-mount-20261012-source-v2.tar.gz`. Do not substitute bare
Ubuntu and claim those repairs remain. A different runtime needs its own review.

The receipt records the binary actually verified. Compiler/package timestamps
and build-time system packages have not been proved byte-reproducible; source
and patch replay, exact artifacts and behavior are the verified properties.
