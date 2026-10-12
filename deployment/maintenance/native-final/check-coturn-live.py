"""Aggregate idle indication or one native Galene check; no peer/log output."""
import json
from pathlib import Path
import re
import struct
import subprocess
import sys

if sys.argv[1:] == ["--idle"]:
    rows = subprocess.check_output(["ss", "-H", "-uan"], text=True).splitlines()
    for service, path in {
        "pairdrop": "/opt/utilibre/turn/turnserver.conf",
        "galene": "/opt/utilibre/pack-data/galene-turn/turnserver.conf",
    }.items():
        text = Path(path).read_text()
        lower = int(re.search(r"^min-port=(\d+)$", text, re.M)[1])
        upper = int(re.search(r"^max-port=(\d+)$", text, re.M)[1])
        count = 0
        for row in rows:
            fields = row.split()
            # ss -H -uan: state, recv-q, send-q, LOCAL, peer.
            port = fields[3].rsplit(":", 1)[-1] if len(fields) > 3 else ""
            if port.isdigit() and lower <= int(port) <= upper:
                count += 1
        print(json.dumps({"service": service, "boundRelaySockets": count}))
elif sys.argv[1:] == ["--galene"]:
    source = Path("deployment/pack/turn/check-security.py").read_text()
    marker = "# Regression: bps-capacity"
    assert source.count(marker) == 1
    namespace = {"__name__": "__main__"}
    # Reuse its checked TLS/denial probes and native protocol implementation,
    # stopping before the six-allocation capacity experiment.
    exec(compile(source.split(marker)[0], "deployment/pack/turn/check-security.py", "exec"), namespace)
    client = namespace["Client"]()
    allocated = False
    try:
        allocated = struct.unpack("!H", client.allocate()[:2])[0] == 0x103
        assert allocated
    finally:
        client.close(allocated=allocated)
    print(json.dumps({"passed": True, "checks": ["Galene native expiring credential allocation and deletion", "expired and wrong credentials refused", "native SFU TLS and unrelated host port denial"], "limitation": "one bounded live allocation; full exact-byte protocol gate uses isolated candidate"}))
else:
    raise SystemExit("Use --idle or --galene. PairDrop: deployment/community/turn/check-security.py --bounded-live")
