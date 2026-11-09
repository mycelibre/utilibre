# Yopass 16.1.0 integration

Source: `jhaals/yopass`, revision `c341c4a514cc0d5989418355e3d876c60c6910f9`,
Apache-2.0. Exact compiler/runtime identities, locks, binary hashes and patch
hash are in `../../maintenance/security-20261109/yopass-inputs.json`.

`source.patch` adds bilingual abuse-report footer links and the additional
checksums required by the pinned Go toolchain. It does not replace encryption,
change account controls, or add a reporting server. Apply only to the declared
revision with `git apply --check`, then verify every recorded lock hash.

Preparation used the pinned Go and Node images, two CPUs and bounded memory.
Controlled acquisition: `GOWORK=off go mod download` and
`yarn install --frozen-lockfile --ignore-scripts`. Verification/build then runs
without external networking or production credentials: `go mod verify`,
`go build -buildvcs=false -trimpath` for both commands (server adds
`-ldflags=-X main.version=16.1.0`), `go test -p 2 ./pkg/... ./cmd/...`,
`yarn build`, and `yarn test:unit`. Go's temporary build directory must allow
execution; its module cache is read-only during verification. The optional
`deploy/cdk` workspace is not part of this deployment. Its twelve high source
dependency records remain recorded, rather than being called fixed or suppressed.

The Dockerfile assembles `yopass`, `yopass-server`, `public/` (website/dist) and
`YOPASS-LICENSE` on the exact recorded distroless security runtime. Check the
local base tag's image ID against the manifest before and after a build. Keep
the previous artifact. No package manager, custom encryption or inference
service is installed. Archived former frontend assets in the base are not
referenced by the new entry point; browser checks cover the loaded asset set.

Required release checks reuse `check-yopass.mjs --upgrade-20261109` and
`check-yopass-browser.mjs`: synthetic native CLI/browser encryption, independent
recipient, first-retrieval race, expiry, limits, old/new-version compatibility,
EN/ES links, and no unexpected browser requests. Scan the candidate using the
recorded advisory snapshot, then separately assess freshness for release.

The public service remains anonymous, text-only, with a 10 KB encrypted-payload
limit and first retrieval or one hour expiry. Explicitly disable secret requests,
read receipts, audit logging and metrics. No hosted integrations or license key
are configured. The native database keeps a random acknowledgement for up to
60 seconds after consuming an item to handle retry ambiguity; it contains no
plaintext or visitor address. Synthetic tests verify its shape and TTL.

Only replace the application container. Do not restart/flush the RAM-only
secret cache: existing encrypted items are compatible and must retain their
remaining lifetime. Reverting the application image/configuration is supported
by the cross-version test; this is not a guarantee for unrelated future releases.
No application-data backup is introduced. Production activation is a separate
scoped release using the existing lock and health gates.
