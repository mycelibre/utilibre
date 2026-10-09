# Mumble encrypted UDP verification, 9 October 2026

**Authenticated encrypted UDP loopback now passes on the application VM, both
against the native container and its published private listener. An independent
external authenticated UDP return-path test remains unperformed.** This does
not replace the earlier public TCP voice test or the external UDP-arrival proof.

## Completed check

`deployment/community/check-mumble-udp.py` pins the already verified native TLS
certificate before sending the invitation password, authenticates normally,
accepts the native cryptographic key exchange, and sends at most two encrypted
connectivity pings. It then sends **one valid 20 ms Opus silence packet** to
Mumble's native server-loopback target **31**. Success requires decrypting and
authenticating the matching response on the UDP socket and matching the native
session, sequence and exact silence payload. It does not fall back to TCP audio.
There is no microphone, channel audio, user recording or message to another user.
Other protocol user/channel messages are ignored and never saved or printed.

Passed on 9 October:

- Native container `172.29.92.10:64738`: pinned TLS, native authentication,
  encrypted connectivity ping and exact encrypted UDP audio loopback.
- Published private listener `10.10.1.43:64738`: the same check passed.
- Six unmodified upstream crypto tests passed, including published OCB vectors,
  nonce recovery, tampering rejection and the attack-prevention regression.
- Python syntax and scoped whitespace checks passed. Missing-secret handling
  stops before making any Mumble connection.

The probe uses the unmodified
[PyMumble crypto helper at a560e60](https://github.com/azlux/pymumble/blob/a560e6013dfbccb3666ce8756e1ca6b790bf05c8/pymumble_py3/crypto.py)
and PyCryptodome 3.23.0, each pinned by SHA-256. Preparation retains the original
upstream licence. No audio client backend or old PyMumble protobuf dependency is
installed. The bounded verification adapter sends only the actual ciphertext
length plus its four-byte crypto header: the helper returns a block-sized
scratch buffer, which must not be sent as extra wire padding. Initial padded
probe failures were test-harness errors, not successful checks or evidence of a
server outage. The server and protocol references are
[Mumble v1.5.915](https://github.com/mumble-voip/mumble/tree/v1.5.915), including
`src/murmur/Server.cpp`, `src/Mumble.proto` and `src/PacketDataStream.h`.

No Mumble image, configuration, authentication, ACL, data, backup or retention
setting changed, and the server was not restarted. The test usernames are
temporary unregistered connections that disappear on disconnect. Native
`ALLOWPING=false` remains intact; unauthenticated public ping replies are not
required for encrypted client UDP. One diagnostic capture was restricted to
the fixture's UDP port and packet-header text; no packet payload or user audio
was recorded.

Private evidence is under `/opt/utilibre/reports/mumble-udp-20261009/`:
`direct-result.json`, `private-result.json`, `upstream-tests.log`, plus the
checksum-verified helper and original licence. A public-hostname attempt from
this same VM timed out; it is not an independent external test and does not
override the prior externally verified TCP and inbound UDP results.

## Concrete remaining external step

The existing `.github/workflows/mumble-external.yml` now has a manual
`authenticated_udp` option, default **false**. Its original secret-free TCP and
tagged UDP probes remain. The optional step reads only the repository secret
`MUMBLE_TEST_SERVER_PASSWORD`, installs the pinned verification dependency,
prepares the checked upstream helper and runs the exact UDP test above from
the existing GitHub-hosted runner. It fails clearly when the secret is absent.
It never places credentials in dispatch inputs, command arguments, source,
artifacts or output. The workflow token retains `contents: read`.

Before dispatch, publish these reviewed test/workflow files through the existing
repository process. An authorized repository administrator must then set
`MUMBLE_TEST_SERVER_PASSWORD` to the **invitation password**, never the
SuperUser/admin password, and enable the manual option. Remove that test secret
after the run. The current API credential received HTTP403 for repository
Actions-secret access, so no secret was uploaded and no authenticated external
run is claimed. No independent SSH host/runner credential is available here.

For delegated API provisioning, GitHub requires a fine-grained token restricted
to this repository with **Secrets: write**; dispatch also needs the repository's
ordinary Actions permission. The owner can instead add the secret through the
repository settings without granting another token. See GitHub's
[repository secret endpoint](https://docs.github.com/en/rest/actions/secrets#create-or-update-a-repository-secret).
This is an access limitation, not a reason to expose a password in workflow
inputs or disable native authentication.

Alternatively, an already authorized operator can run the same small check on
a genuinely external Linux x86_64 machine with Python and outbound TCP/UDP64738.
After checking out the reviewed repository, in Bash:

```bash
python3 -m venv /tmp/utilibre-mumble-check
/tmp/utilibre-mumble-check/bin/pip install --no-cache-dir --no-deps --require-hashes -r deployment/community/mumble-udp-requirements.txt
python3 deployment/community/prepare-mumble-udp.py /tmp/utilibre-mumble-helper
read -r -s -p 'Mumble invitation password: ' MUMBLE_TEST_SERVER_PASSWORD
export MUMBLE_TEST_SERVER_PASSWORD
/tmp/utilibre-mumble-check/bin/python deployment/community/check-mumble-udp.py --location external-runner --crypto-path /tmp/utilibre-mumble-helper/crypto.py
unset MUMBLE_TEST_SERVER_PASSWORD
```

Do not run under shell tracing. Retain only the resulting boolean JSON evidence,
runner/network identity and time, then remove the temporary dependency/helper
directories. The `--location` label records the execution context; it cannot
turn a same-VM run into independent external evidence. An external passing
result verifies that one encrypted UDP round trip, not sustained voice capacity
or every participant's network.
