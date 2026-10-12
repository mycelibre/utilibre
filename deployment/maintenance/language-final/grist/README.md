# Grist 1.7.21 native runtime leaves

This layer starts from the independently tested Deno 2.9.7/Pyodide sandbox
image, exact ID guarded by `build.mjs`. It does not restore runsc, change
sandbox permissions, or remove the wrapper that disables Deno update checks.

The committed npm lockfile records official registry archive integrities,
licenses and compatible engine requirements. Selected fixes retain their
existing major/API series: axios 1.20.0, brace-expansion 1.1.21/2.1.7,
engine.io 6.6.10, fast-uri 3.1.7, form-data 4.0.6, js-yaml 3.15.2/4.3.2,
jws 3.2.3/4.0.1, path-to-regexp 0.1.13, undici 6.28.1 and ws 8.21.3.
The separate npm installer copies receive ip-address 10.5.0 and picomatch 4.0.4.
Published package metadata was checked against https://registry.npmjs.org/
on 2026-10-11. No package install scripts run during the overlay build.

`replace.cjs` validates every exact old package before changing physical
directories, including vulnerable nested copies. Updated packages resolve
their dependencies from the bounded lockfile tree. Old package metadata is
not hidden behind a replacement symlink. Compiled frontend bundles are not
rewritten: this is explicitly a native server/package fix, not proof about
code embedded into previously built browser bundles.

```sh
node deployment/maintenance/language-final/grist/build.mjs
docker run --rm -i --network none --read-only --cpus 1 --memory 512m \
  --entrypoint node utilibre-grist:1.7.21-language-security-20261011 - \
  < deployment/maintenance/language-final/grist/native.cjs
node deployment/maintenance/sandbox-final/check-grist.mjs \
  utilibre-grist:1.7.21-language-security-20261011
```

The final candidate is `sha256:aff22494de8e208a15198b124a7772fd07e9a38e009e0043c664927ab788f4b0`.
Seventeen exact installed-module checks and real YAML/JWS/URI/route parsing,
brace expansion and local Axios/Undici requests passed. The full native gate
passed at 22:59 UTC; its private receipt is
`/var/lib/utilibre-maintenance/sandbox-final-20261011/native-KFXaGe/result.json`.
The complete
existing gate requires private API save/formulas, independent-account denial,
CSV/native import/export, sandbox denied operations and a fresh isolated
synthetic restore. No production database or credentials are used by it.
Root owns production backup, exact Compose pin and release coordination.
That final image is now deployed: the coordinating release receipt and
public authenticated formula/export/account-boundary checks passed. See
[`sandbox-final/README.md`](../../sandbox-final/README.md) for the live checks,
saved-work backup, synthetic-account cleanup and precise rollback procedure.

The final immutable-image scan measured 0 critical / 68 high occurrences,
including 7 Node HIGH occurrences (down from 53 on the sandbox-only image).
These are scanner occurrences, not demonstrated exploitability counts.
Major-only repairs (basic-ftp, image-size, ip-address 9.x), npm 10's
pacote/sigstore, and unfixed http-cache-semantics findings remain visible;
no waiver is created by this layer. Native OS/Python findings are separate.
