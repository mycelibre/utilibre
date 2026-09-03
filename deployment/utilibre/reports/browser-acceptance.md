# Private browser acceptance report

- Run: 2026-08-30 05:07 UTC
- Private application address: `${APP_BIND_IP}` (redacted from this publishable report)
- Browser: Playwright 1.62.1 with Chromium 151.0.7922.34
- Result: **The tested private endpoints and browser operations passed, with the launch caveats below.**

## Method and limits

The tests loaded only the five assigned private endpoints. They did not inspect or interact with Cobalt or SearXNG and did not modify any application container or configuration.

For BentoPDF, VERT, OmniTools, and PrivateBin, browser requests were mapped in Playwright from the intended HTTPS origin to the corresponding private HTTP endpoint. This emulates TLS termination sufficiently to exercise secure-context browser APIs without creating a temporary proxy or changing the deployment. It does **not** verify public DNS, the real edge route, its certificate, or its final response headers. PairDrop was exercised directly on its private HTTP/WebSocket endpoint.

For client-side operations, request monitoring began only after the page and its initial static assets had finished loading. The test recorded method, destination, resource type, presence of a request body, and whether the unique test marker appeared in a body. It did not retain user content.

## Results

### BentoPDF — `${APP_BIND_IP}:3101`

- Page returned HTTP 200 and rendered as `Text to PDF - BentoPDF`.
- Typed text was converted in the browser to an 11,471-byte file named `text_to_pdf.pdf`; the output began with the `%PDF-` signature.
- No POST, PUT, or PATCH occurred during the operation, and the text marker was not transmitted.
- The operation made 15 bodyless GET requests to `cdn.jsdelivr.net` for the pinned `@bentopdf/pymupdf-wasm@0.11.16` Pyodide/WASM runtime and supporting wheels. The PDF was processed locally, but the browser still contacts that CDN and therefore exposes the visitor's network address and the fact that the tool is in use.
- The private server currently returns:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: credentialless`
- Under the emulated HTTPS origin, `window.isSecureContext` and `window.crossOriginIsolated` were true and `SharedArrayBuffer` was available.
- Direct private HTTP is not a trustworthy browser context. The real `https://pdf.utilibre.org` edge route must still be tested. The requested edge policy is `Cross-Origin-Embedder-Policy: require-corp`; that differs from the private container's current `credentialless` header and must be supplied and verified at the edge without overwriting the upstream CSP.

### VERT — `${APP_BIND_IP}:3102`

- Page returned HTTP 200 and rendered as `VERT.sh`.
- A 64×48 SVG was converted locally to an 858-byte `VERT_local-operation.png` download.
- A Markdown document also reached the completed-conversion state using VERT's local Pandoc WASM worker.
- Across both operations there were no POST, PUT, or PATCH requests, no request body, and no test marker transmission. No VERT conversion daemon or other conversion API was contacted.
- Two bodyless GETs went to `cdn.jsdelivr.net` for `@ffmpeg/core@0.12.10` JavaScript and WASM. VERT fetched these even though the representative operations were image/document conversions. This is a privacy and offline-use caveat: the files were not uploaded, but the browser contacts a third party.
- VERT warns on direct private HTTP that some browser features may fail. The operation was therefore exercised under the emulated HTTPS origin; real public HTTPS remains to be verified.

### OmniTools — `${APP_BIND_IP}:3103`

- Page returned HTTP 200 and rendered as `Validate JSON - OmniTools`.
- The JSON validator accepted a marked JSON object and displayed a valid result.
- It made zero requests after load: no upload, mutation request, WebSocket, beacon, or third-party request occurred during the operation.

### PairDrop — `${APP_BIND_IP}:3105`

- Two isolated browser sessions each returned HTTP 200.
- Each session opened one live WebSocket to `/server?webrtc_supported=true`; both sockets exchanged frames with zero socket errors.
- Each session discovered the other as a peer.
- A unique text message transferred successfully and matched exactly at the receiver.
- A 122-byte text file transferred successfully, downloaded as `local-operation.txt`, and matched the sent content.
- This proves private-endpoint WebSocket signaling, same-network discovery, and WebRTC text/file transfer. It does not prove the future public `wss://send.utilibre.org` edge upgrade or difficult cross-network NAT traversal. No TURN relay was tested or deployed.

### PrivateBin — `${APP_BIND_IP}:3108`

- Page returned HTTP 200 as `Utilibre Paste` under the emulated HTTPS origin, where WebCrypto was available.
- A unique burn-after-reading paste was encrypted in the browser and created successfully. The complete retrieval URL contained a fragment key.
- The exact new server payload file was positively identified. Its bytes did not contain the plaintext test phrase.
- A second isolated browser session retrieved and decrypted the plaintext using the complete URL.
- Reading the paste burned it; the positively identified payload file was removed. No test paste remains.
- Direct private HTTP correctly cannot perform this operation: it is not a secure context and `crypto.subtle` is unavailable. Real public HTTPS is mandatory and remains to be tested after the edge route and DNS exist.

## Privacy conclusion

The tested content stayed out of any conversion backend: BentoPDF, VERT, and OmniTools emitted no mutation requests and did not transmit their test markers. PairDrop transferred its test content peer-to-peer after WebSocket signaling. PrivateBin intentionally sent only browser-encrypted ciphertext to its server, and the stored payload did not contain the marker in plaintext.

The local-processing label still needs precise disclosure: BentoPDF and VERT contact jsDelivr for executable runtime assets after the user starts an operation. That is not a file upload, but it is an external browser connection. OmniTools' tested JSON operation completed with no post-load network activity.

## Launch checks still required

- Apply DNS and the generated Caddy edge routes.
- Re-run these tests against the real public HTTPS hostnames.
- Confirm BentoPDF's public response has COOP `same-origin`, COEP `require-corp`, an intact upstream CSP, `window.crossOriginIsolated === true`, and `SharedArrayBuffer` available.
- Confirm PairDrop upgrades successfully over public `wss://` and that the edge overwrites forwarded headers.
- Decide whether the documented jsDelivr runtime fetches are acceptable or should be self-hosted in a separately reviewed deployment change.

## Public BentoPDF follow-up, 2026-09-03

The real public text-to-PDF workflow returned 200 and produced a valid
12,379-byte PDF without transmitting the synthetic input marker. It also
confirmed the expected post-load jsDelivr dependency. The public edge response,
however, carried two COOP values and two conflicting COEP values: upstream
`credentialless` plus edge-added `require-corp`. Chromium consequently reported
`window.crossOriginIsolated === false` and no `SharedArrayBuffer`.

The edge fragment now uses `header_down` inside the BentoPDF reverse proxy to
replace, rather than append to, both upstream headers. After the correction was
applied, `npm run test:public:bentopdf` passed against the public route with one
COOP value, one COEP value, an intact CSP, browser isolation, and
`SharedArrayBuffer` availability. Keep that command as the regression gate for
future edge and BentoPDF changes.

## Reproduction

From `portal/`:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/freetools-playwright \
  node tests/e2e/utilibre-apps-acceptance.mjs
```

The automation and harmless fixtures are retained in:

- `portal/tests/e2e/utilibre-apps-acceptance.mjs`
- `deployment/utilibre/tests/fixtures/local-operation.txt`
- `deployment/utilibre/tests/fixtures/local-operation.md`
- `deployment/utilibre/tests/fixtures/local-operation.svg`
