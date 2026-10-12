"""Read-only linux-libc-dev payload inspection; no kernel/proc contents read."""
import hashlib
import json
import os
import re
import stat
import subprocess
import sys

tokens = json.loads(sys.argv[1])
assert tokens and all(re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", t) for t in tokens)
query = lambda *args: subprocess.check_output(["dpkg-query", *args], text=True).strip()
version = query("-W", "-f=${Version}", "linux-libc-dev")
status = query("-W", "-f=${Status}", "linux-libc-dev")
paths = sorted(set(query("-L", "linux-libc-dev").splitlines()))
roots = ("/usr/include/", "/usr/share/doc/", "/usr/lib/linux/uapi/")
parents = {"/.", "/usr", "/usr/include", "/usr/share", "/usr/share/doc", "/usr/lib", "/usr/lib/linux", "/usr/lib/linux/uapi"}
allowed = lambda p: p in parents or p.startswith(roots)
records, present, total, headers = [], set(), 0, 0
for path in paths:
    assert allowed(path) and "/../" not in path, path
    assert not re.search(r"\.(c|ko|so|a)$|vmlinuz", path), path
    try:
        st = os.lstat(path)
    except FileNotFoundError:
        # Some upstream image builds prune documentation. Never excuse a missing
        # header or claim that these absent documentation bytes were inspected.
        assert path.startswith('/usr/share/doc/'), path
        records.append({"path": path, "type": "missing-document"})
        continue
    if stat.S_ISDIR(st.st_mode):
        records.append({"path": path, "type": "directory"})
        continue
    if stat.S_ISLNK(st.st_mode):
        target = os.path.realpath(path)
        assert allowed(target), path
        # Every linked header target must itself belong to this exact package.
        assert target in paths, (path, target)
        records.append({"path": path, "type": "symlink", "target": os.readlink(path)})
        continue
    assert stat.S_ISREG(st.st_mode), path
    assert st.st_size <= 2 * 1024**2, path
    total += st.st_size
    assert total <= 64 * 1024**2
    with open(path, "rb") as handle:
        body = handle.read(2 * 1024**2 + 1)
    assert len(body) == st.st_size
    assert not body.startswith((b"\x7fELF", b"!<arch>")), path
    document = path.startswith("/usr/share/doc/")
    if not document:
        assert path.endswith(".h") and b"\x00" not in body, path
        headers += 1
        for token in tokens:
            if re.search(rb"\b" + token.encode("ascii") + rb"\b", body):
                present.add(token)
    records.append({"path": path, "type": "document" if document else "header", "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()})
canonical = json.dumps(records, separators=(",", ":"), ensure_ascii=False).encode()
assert query("-W", "-f=${Version}", "linux-libc-dev") == version
assert query("-W", "-f=${Status}", "linux-libc-dev") == status
print(json.dumps({"package": "linux-libc-dev", "installed": version, "status": status,
                  "headers": headers, "bytes": total, "records": records,
                  "checkedPrivateTokens": tokens, "presentPrivateTokens": sorted(present),
                  "payloadSha256": hashlib.sha256(canonical).hexdigest()}, separators=(",", ":")))
