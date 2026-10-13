# Password-generator correction — 8 October 2026

Reviewing the request for a dedicated password/passphrase workflow found that the installed OmniTools 0.6.0 password generator and IT Tools 2024.10.22 token generator used `Math.random()`. Neither source was appropriate for generating secrets. This review is evidence about the implementation, not evidence that a particular visitor's password was recovered or compromised.

Both deployed generators now draw from browser WebCrypto with rejection sampling before selecting characters. They fail closed when WebCrypto is absent. Character-selection options and length controls remain native. Selecting several character categories defines an allowed alphabet; it does not guarantee every category appears in every result. No generated secret, clipboard value or browser work is logged by the checks.

- OmniTools: `utilibre-omnitools:0.6.0-p6`, replacing p5.
- IT Tools: `utilibre-ittools:2024.10.22-p2`, replacing p1.
- Native paths: `https://tools.utilibre.org/string/password-generator` and `https://dev.utilibre.org/token-generator`.
- Existing open pages must be reloaded to receive the fix. For passwords made with the previous generators, create replacements with the corrected generator or a trusted password manager and change them at the relevant accounts; do not reuse them.

## Small, reproducible changes

`deployment/toolbox/secure-random.mjs` is the shared helper. The two readable `*-secure-random.patch` files change only each native generator. `prepare-secure-random.mjs` applies the same helper to the exact pinned distribution: it checks the complete original chunk SHA-256 and exactly one replacement, failing the build if upstream changes. All affected immutable JS/CSS URLs receive new version names. No unrelated random helper, authentication system, telemetry, dependency or application feature is changed.

The source patches are registered in `deployment/source-patches.json` with pinned revisions and explicit removal conditions. Remove them when a reviewed upstream release provides a secure generator without modulo bias or an insecure fallback, after rerunning the native checks. Corresponding readable source and build recipes are published at `/utilibre-source/omnitools-utilibre.tar.gz` and `/utilibre-source/it-tools-utilibre.tar.gz`; the previous `it-tools.tar.gz` URL also serves the corrected archive.

## Verification and deployment

`node --test deployment/toolbox/secure-random.test.mjs` checks lengths, allowed alphabets, invalid/empty inputs, rejection of an incomplete upper random range, absence of a Math.random fallback, failure without WebCrypto, and both patched native generators. This is not a statistical certification of a browser's random-number implementation.

`python3 scripts/audit-source-patches.py` verified that all 22 patches present at this stage applied and reversed exactly against their pinned sources. Later additions may increase that count.

Both Docker images built successfully. `deployment/toolbox/check-password-generators.mjs` passed first against isolated previews, then against public HTTPS with `UTILIBRE_PUBLIC_CHECK=1`: native output lengths, regeneration, actual WebCrypto calls and no browser application errors. Tests discard outputs. Both public pages returned 200 with the new versioned assets, and both corresponding-source archive URLs returned 200. A first public check immediately after container recreation encountered a browser network-change error; the subsequent public check passed for both applications.

Only the two static containers were recreated. No stateful service, RAM notification cache, paste store or file-transfer signaling server was restarted. Temporary preview containers were removed. The prior images remain available for incident recovery, but they contain the insecure generator and should not be restored as a normal rollback. Prefer a forward fix or temporarily make only an affected generator route unavailable if the secure release regresses. Restore unrelated settings field-by-field, not by replacing whole configuration files with an old copy.

Private build logs, previous compose/source-index copies and patch-check evidence are under `/opt/utilibre/reports/content-review-20261008/password-build/`. No real user data was used.
