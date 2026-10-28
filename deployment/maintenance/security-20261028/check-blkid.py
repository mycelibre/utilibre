"""Native DOS/EBR parser checks on small fictional regular files, never devices."""
import ctypes as C
import json
from pathlib import Path
import struct
import sys
import tempfile

library, expected = sys.argv[1:]
assert expected in ('before', 'after')
lib = C.CDLL(library)
def bind(name, result, *args):
    f = getattr(lib, name)
    f.restype, f.argtypes = result, list(args)
    return f
pointer = C.c_void_p
new = bind('blkid_new_probe_from_filename', pointer, C.c_char_p)
free = bind('blkid_free_probe', None, pointer)
superblocks = bind('blkid_probe_enable_superblocks', C.c_int, pointer, C.c_int)
partitions = bind('blkid_probe_enable_partitions', C.c_int, pointer, C.c_int)
probe = bind('blkid_do_fullprobe', C.c_int, pointer)
getlist = bind('blkid_probe_get_partitions', pointer, pointer)
count = bind('blkid_partlist_numof_partitions', C.c_int, pointer)
getpart = bind('blkid_partlist_get_partition', pointer, pointer, C.c_int)
start = bind('blkid_partition_get_start', C.c_longlong, pointer)
size = bind('blkid_partition_get_size', C.c_longlong, pointer)
extended = bind('blkid_partition_is_extended', C.c_int, pointer)

def entry(data, sector, slot, kind, offset, length):
    struct.pack_into('<B3sB3sII', data, sector * 512 + 446 + slot * 16,
                     0, b'\0'*3, kind, b'\0'*3, offset, length)
    data[sector*512+510:sector*512+512] = b'\x55\xaa'

def inspect(path):
    pr = new(str(path).encode())
    assert pr
    try:
        assert superblocks(pr, 0) == partitions(pr, 1) == 0
        assert probe(pr) in (0, 1)
        ls = getlist(pr)
        return [(start(p), size(p)) for i in range(max(0, count(ls)))
                if (p := getpart(ls, i)) and not extended(p)] if ls else []
    finally:
        free(pr)

rows = []
with tempfile.TemporaryDirectory(prefix='utilibre-blkid-fixture-') as directory:
    path = Path(directory) / 'fictional.img'
    for slot in range(4):
        for label, offset, length in [('valid', 1, 8), ('wrap', 0xfffffffe, 8),
                                      ('outside', 110, 8)]:
            data = bytearray(128 * 512)
            entry(data, 0, 0, 5, 2, 100)
            entry(data, 2, slot, 0x83, offset, length)
            path.write_bytes(data)
            result = inspect(path)
            if label == 'valid': assert result == [(3, 8)], (slot, result)
            if expected == 'after' and label != 'valid': assert result == [], (slot, result)
            if expected == 'before' and label == 'wrap' and slot < 2:
                assert result == [(0, 8)], ('baseline did not reproduce', slot, result)
            rows.append({'slot': slot, 'case': label, 'partitions': result})
    data = bytearray(128 * 512)
    entry(data, 0, 0, 0x83, 1, 16)
    path.write_bytes(data)
    assert inspect(path) == [(1, 16)]
    path.write_bytes(bytes(4096))
    assert inspect(path) == []
print(json.dumps({'passed': True, 'state': expected, 'regularFilesOnly': True,
                  'checks': len(rows)+2, 'rows': rows}))
