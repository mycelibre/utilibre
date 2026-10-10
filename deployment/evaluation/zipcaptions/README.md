# Local-only recognition prerequisite check

This is an isolated compatibility probe, not a deployed caption service. It
uses the existing Playwright installation. No Azure, microphone recording,
Whisper, model download, public listener or service restart is involved.

Run from the repository root on the evaluation VM:

```sh
timeout 30s unshare --net sh -c 'ip link set lo up; exec node deployment/evaluation/zipcaptions/check-local-recognition.mjs full-headless /tmp/zipcaptions-headless.json'
```

The namespace provides no external route. The script intercepts an owned
fictional HTTPS page, checks the actual `processLocally` member and native
`available()` API, then invokes native `install()` after a button click with
network access still disabled. It never calls `start()` or `getUserMedia()`.
Full Chromium is selected explicitly because the headless shell crashed in
the earlier probe. Headed mode is `full-headed` and needs an existing X server.

On 9 October 2026 full Chromium 151 returned `downloadable` for EN/ES and
`false` for installation without egress, in both headed/headless modes. This
does not test speech recognition or establish a FOSS grant for a model pack.
See the service review for the precise outstanding engine/licence requirement.
