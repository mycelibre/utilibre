#!/usr/bin/env python3
"""Synthetic Python/XML and private D-Bus consumer test; never the system bus."""
import json
import os
from pathlib import Path
import pyexpat
import selectors
import subprocess
import sys
import tempfile

assert sys.argv[1:] in (["2.9.0"], ["2.10.0"])
assert pyexpat.EXPAT_VERSION == "expat_" + sys.argv[1]
text = []
parser = pyexpat.ParserCreate()
parser.CharacterDataHandler = text.append
parser.Parse("<notice>Fictional: áéíóú ñ</notice>".encode(), True)
assert "".join(text) == "Fictional: áéíóú ñ"
for malformed in (b"<notice>", b"<a></b>", b"<a>\xff</a>"):
    try:
        pyexpat.ParserCreate().Parse(malformed, True)
    except pyexpat.ExpatError:
        pass
    else:
        raise AssertionError("Malformed XML accepted")

with tempfile.TemporaryDirectory(prefix="utilibre-expat-bus-") as work:
    cfg = Path(work) / "session.conf"
    cfg.write_text('''<busconfig><type>session</type>
<listen>unix:tmpdir=''' + work + '''</listen><auth>EXTERNAL</auth>
<policy context="default"><allow send_destination="*"/><allow receive_sender="*"/>
<allow own="*"/></policy></busconfig>''')
    with (Path(work) / "bus-error.log").open("w+") as errors:
        bus = subprocess.Popen(["/usr/bin/dbus-daemon", "--nofork",
                                "--config-file=" + str(cfg), "--print-address=1"],
                               stdout=subprocess.PIPE, stderr=errors, text=True)
        try:
            with selectors.DefaultSelector() as selector:
                selector.register(bus.stdout, selectors.EVENT_READ)
                assert selector.select(5), "Private bus did not start"
                address = bus.stdout.readline().strip()
            assert address.startswith("unix:path=" + work + "/")
            maps = Path(f"/proc/{bus.pid}/maps").read_text()
            library_dir = os.environ["LD_LIBRARY_PATH"].rstrip("/")
            assert any(library_dir + "/libexpat.so." in line for line in maps.splitlines())
            def call(method):
                return subprocess.run(["/usr/bin/dbus-send", "--bus=" + address,
                    "--print-reply", "--type=method_call", "--dest=org.freedesktop.DBus",
                    "/org/freedesktop/DBus", method], check=True, capture_output=True,
                    text=True, timeout=5).stdout
            assert "org.freedesktop.DBus" in call("org.freedesktop.DBus.ListNames")
            assert "org.freedesktop.DBus.Introspectable" in call("org.freedesktop.DBus.Introspectable.Introspect")
        finally:
            bus.terminate()
            try:
                bus.wait(timeout=5)
            except subprocess.TimeoutExpired:
                bus.kill()
                bus.wait(timeout=5)
            bus.stdout.close()

print(json.dumps({"passed": True, "version": sys.argv[1], "checks": 7,
                  "pythonBinding": True, "privateBus": True,
                  "busCandidateMapping": True, "productionBusContacted": False}))
