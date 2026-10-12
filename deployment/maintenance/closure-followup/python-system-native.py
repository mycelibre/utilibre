"""Native packaged CPython compatibility; fictional temporary files only."""
import ctypes
import json
import pathlib
import platform
import pyexpat
import sqlite3
import ssl
import subprocess
import sys
import sysconfig
import tarfile
import tempfile
import urllib.request
import venv

assert platform.python_version() == "3.13.16"
assert pyexpat.EXPAT_VERSION == "expat_2.9.0"
assert sysconfig.get_config_var("SOABI") == "cpython-313-x86_64-linux-gnu"
assert ctypes.CDLL(None).getpid() > 0
assert ssl.create_default_context().check_hostname
assert pyexpat.ParserCreate().Parse(b"<fictional/>", True) == 1
with sqlite3.connect(":memory:") as db:
    db.execute("create table fictional(label text)")
    db.execute("insert into fictional values(?)", ("Ficción ñ",))
    assert db.execute("select label from fictional").fetchone() == ("Ficción ñ",)
with tempfile.TemporaryDirectory(prefix="utilibre-python-native-") as tmp:
    root = pathlib.Path(tmp)
    (root / "fictional.txt").write_text("Ficción ñ", encoding="utf-8")
    with tarfile.open(root / "fictional.tar", "w") as archive:
        archive.add(root / "fictional.txt", arcname="fictional.txt")
    with tarfile.open(root / "fictional.tar") as archive:
        archive.extractall(root / "restored", filter="data")
    assert (root / "restored/fictional.txt").read_text() == "Ficción ñ"
    # Basic environment creation does not download or bootstrap pip.
    venv.create(root / "environment", with_pip=False)
    env = dict(__import__("os").environ)
    env.pop("PYTHONHOME", None)
    env.pop("PYTHONPATH", None)
    output = subprocess.check_output(
        [str(root / "environment/bin/python"), "-c", "import sys;print(sys.version_info[:3])"],
        env=env, text=True, timeout=20,
    )
    assert output.strip() == "(3, 13, 16)"
print(json.dumps({"passed": True, "version": platform.python_version(),
                  "expat": pyexpat.EXPAT_VERSION, "soabi": sysconfig.get_config_var("SOABI"),
                  "sqliteUnicode": True, "tarRoundTrip": True, "venv": True,
                  "tlsVerificationDefault": True, "networkRequests": 0}))
