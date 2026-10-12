"""Build-time asset preservation for frozen ELF64 little-endian Go binaries.

Layout: Go1.27.1 src/embed/embed.go and cmd/compile/internal/staticdata/embed.go.
Hash encoding: cmd/compile/internal/staticdata/data.go and cmd/internal/hash/hash.go.
Only complete self-pointing embed.FS slices with valid per-file hashes qualify.
Never executes the binary, opens network paths, or reads application volumes.
"""
import argparse
import hashlib
import gzip
import json
import pathlib
import struct


def extract(blob, prefixes, table_records=None):
    assert blob[:7] == b"\x7fELF\x02\x01\x01", "Only ELF64 little-endian supported"
    assert struct.unpack_from("<H", blob, 18)[0] == 62, "Only x86-64 reviewed"
    phoff = struct.unpack_from("<Q", blob, 32)[0]
    phsize, phnum = struct.unpack_from("<HH", blob, 54)
    assert phsize == 56 and 0 < phnum < 100
    loads = []
    for index in range(phnum):
        kind, flags, offset, addr, _, size, _, _ = struct.unpack_from("<IIQQQQQQ", blob, phoff + index * phsize)
        if kind == 1:
            assert offset + size <= len(blob)
            loads.append((offset, addr, size, flags))

    def at(addr, size):
        assert 0 <= size <= len(blob)
        for offset, start, length, _ in loads:
            if start <= addr and addr + size <= start + length:
                begin = offset + addr - start
                return blob[begin:begin + size]
        raise ValueError("Unmapped embedded pointer")

    result, tables = {}, []
    for offset, addr, size, flags in loads:
        if flags & 2:  # Go's embed.FS tables are read-only, not writable memory.
            continue
        for pos in range(offset, offset + size - 24, 8):
            ptr, count, cap = struct.unpack_from("<QQQ", blob, pos)
            if not (ptr == addr + pos - offset + 24 and count == cap and 0 < count <= 100000):
                continue
            if table_records is not None and count != table_records:
                continue
            if pos + 24 + count * 48 > offset + size:
                continue
            files = {}
            try:
                for index in range(count):
                    record = pos + 24 + index * 48
                    name_ptr, name_len, data_ptr, data_len = struct.unpack_from("<QQQQ", blob, record)
                    if not 0 < name_len <= 512:
                        raise ValueError("Bad filename length")
                    name = at(name_ptr, name_len).decode("utf-8")
                    parts = name.rstrip("/").split("/")
                    if any(p in ("", ".", "..") for p in parts) or "\\" in name or "\0" in name:
                        raise ValueError("Unsafe embedded path")
                    digest = blob[record + 32:record + 48]
                    if name.endswith("/"):
                        if data_ptr or data_len or digest != bytes(16):
                            raise ValueError("Malformed directory")
                        continue
                    data = at(data_ptr, data_len)
                    if len(data) <= 1024:
                        calculated = bytearray(hashlib.sha256(data).digest())
                        calculated[0] ^= 0xff
                    else:
                        calculated = hashlib.sha256(b"\x01" + data).digest()
                    if calculated[:16] != digest:
                        raise ValueError("Embedded content hash mismatch")
                    if name in files:
                        raise ValueError("Duplicate embedded filename")
                    files[name] = data
            except (ValueError, UnicodeDecodeError, AssertionError):
                continue
            chosen = {n: b for n, b in files.items() if any(n == p or n.startswith(p + "/") for p in prefixes)}
            if chosen:
                for name, data in chosen.items():
                    assert name not in result or result[name] == data, "Ambiguous duplicate filesystem"
                    result[name] = data
                tables.append({"records": count, "selectedFiles": len(chosen)})
    assert result and all(any(n == p or n.startswith(p + "/") for n in result) for p in prefixes), "Required embedded tree absent"
    return result, tables


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binary", type=pathlib.Path)
    parser.add_argument("destination", type=pathlib.Path)
    parser.add_argument("prefix", nargs="+")
    parser.add_argument("--table-records", type=int)
    args = parser.parse_args()
    assert all(p and "/" not in p and p not in (".", "..") for p in args.prefix)
    assert not args.destination.exists(), "Never overwrite an existing asset tree"
    blob = gzip.decompress(args.binary.read_bytes()) if args.binary.suffix == ".gz" else args.binary.read_bytes()
    files, tables = extract(blob, args.prefix, args.table_records)
    args.destination.mkdir(mode=0o700, parents=True)
    for name, data in files.items():
        output = args.destination / name
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(data)
    manifest = {"binarySha256": hashlib.sha256(blob).hexdigest(), "tables": tables,
                "files": [{"path": n, "size": len(b), "sha256": hashlib.sha256(b).hexdigest()} for n, b in sorted(files.items())]}
    (args.destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"files": len(files), "bytes": sum(map(len, files.values())), "tables": tables}))
