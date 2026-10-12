"""Synthetic offline packets only: no interface discovery or live capture."""
import ctypes as C
import json
import struct
import sys
import tempfile
from pathlib import Path


class Insn(C.Structure):
    _fields_ = [("code", C.c_ushort), ("jt", C.c_ubyte), ("jf", C.c_ubyte), ("k", C.c_uint32)]


class Program(C.Structure):
    _fields_ = [("length", C.c_uint), ("instructions", C.POINTER(Insn))]


class Timeval(C.Structure):
    _fields_ = [("seconds", C.c_long), ("microseconds", C.c_long)]


class Header(C.Structure):
    _fields_ = [("time", Timeval), ("captured", C.c_uint32), ("length", C.c_uint32)]


lib = C.CDLL(sys.argv[1])
for name, args, result in [
    ("pcap_lib_version", [], C.c_char_p),
    ("pcap_open_dead", [C.c_int, C.c_int], C.c_void_p),
    ("pcap_compile", [C.c_void_p, C.POINTER(Program), C.c_char_p, C.c_int, C.c_uint32], C.c_int),
    ("pcap_offline_filter", [C.POINTER(Program), C.POINTER(Header), C.c_void_p], C.c_uint),
    ("pcap_freecode", [C.POINTER(Program)], None),
    ("pcap_close", [C.c_void_p], None),
    ("pcap_dump_open", [C.c_void_p, C.c_char_p], C.c_void_p),
    ("pcap_dump", [C.c_void_p, C.POINTER(Header), C.c_void_p], None),
    ("pcap_dump_close", [C.c_void_p], None),
    ("pcap_open_offline", [C.c_char_p, C.c_char_p], C.c_void_p),
    ("pcap_next_ex", [C.c_void_p, C.POINTER(C.POINTER(Header)), C.POINTER(C.c_void_p)], C.c_int),
    ("bpf_filter", [C.POINTER(Insn), C.c_void_p, C.c_uint, C.c_uint], C.c_uint),
]:
    function = getattr(lib, name)
    function.argtypes, function.restype = args, result

version = lib.pcap_lib_version().decode()
assert "1.10.7" in version, version
handle = lib.pcap_open_dead(1, 65535)
assert handle
packet = bytes.fromhex("0000000000020000000000010800450000280000000040060000c0000201c0000202")
packet += struct.pack("!HH", 12345, 443) + bytes.fromhex("00000000000000005002040000000000")
header = Header(Timeval(0, 0), len(packet), len(packet))
data = C.create_string_buffer(packet)
program = Program()
try:
    assert lib.pcap_compile(handle, C.byref(program), b"ip and tcp dst port 443", 1, 0xFFFFFFFF) == 0
    try:
        assert lib.pcap_offline_filter(C.byref(program), C.byref(header), data) > 0
        other = C.create_string_buffer(packet[:36] + struct.pack("!H", 80) + packet[38:])
        assert lib.pcap_offline_filter(C.byref(program), C.byref(header), other) == 0
    finally:
        lib.pcap_freecode(C.byref(program))
    assert lib.pcap_compile(handle, C.byref(Program()), b"[invalid filter", 1, 0xFFFFFFFF) == -1

    # CVE-2026-0799: reject scratch-register indices beyond the 16 slots.
    # Exercise all four load/store opcodes, in this unprivileged test only.
    checks = 0
    for opcode in (0x60, 0x61, 0x02, 0x03):
        for index in (16, 0xFFFFFFFF):
            instructions = (Insn * 2)(Insn(opcode, 0, 0, index), Insn(0x06, 0, 0, 65535))
            assert lib.bpf_filter(instructions, data, len(packet), len(packet)) == 0
            checks += 1

    with tempfile.TemporaryDirectory(prefix="utilibre-fictional-pcap-") as directory:
        file = str(Path(directory) / "fictional.pcap").encode()
        output = lib.pcap_dump_open(handle, file)
        assert output
        lib.pcap_dump(output, C.byref(header), data)
        lib.pcap_dump_close(output)
        error = C.create_string_buffer(256)
        saved = lib.pcap_open_offline(file, error)
        assert saved, error.value
        try:
            received_header, received = C.POINTER(Header)(), C.c_void_p()
            assert lib.pcap_next_ex(saved, C.byref(received_header), C.byref(received)) == 1
            assert received_header.contents.captured == len(packet)
            assert C.string_at(received, len(packet)) == packet
            assert lib.pcap_next_ex(saved, C.byref(received_header), C.byref(received)) == -2
        finally:
            lib.pcap_close(saved)
finally:
    lib.pcap_close(handle)
print(json.dumps({"passed": True, "version": version, "scratchBoundCases": checks,
                  "offlineFilterAcceptedAndRejected": True, "invalidSyntaxRejected": True,
                  "syntheticDumpReadRoundtrip": True, "livePacketsCaptured": 0}))
