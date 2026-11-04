#!/usr/bin/env python3
"""Small synthetic compression variants; keeps the enclosing HEIF layout intact."""
from pathlib import Path
import sys
import zlib

root = Path(sys.argv[1])
content = b"<fictional>" + b"x" * 65536 + b"</fictional>"
wrapped = zlib.compress(content)
image = (root / "metadata.heic").read_bytes()
assert image.count(wrapped) == 1
variants = {
    "raw": wrapped[2:-4] + b"\0" * 6,
    "bad-checksum": wrapped[:-1] + bytes([wrapped[-1] ^ 1]),
    "bad-header": bytes([wrapped[0] ^ 1]) + wrapped[1:],
}
for name, payload in variants.items():
    assert len(payload) == len(wrapped)
    (root / f"metadata-{name}.heic").write_bytes(image.replace(wrapped, payload))
