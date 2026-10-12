"""Small native PCRE2 compile/JIT/capture/UTF/error fixture; no file/user input."""
import ctypes as c
lib=c.CDLL('libpcre2-8.so.0')
lib.pcre2_compile_8.restype=c.c_void_p
lib.pcre2_compile_8.argtypes=[c.c_char_p,c.c_size_t,c.c_uint,c.POINTER(c.c_int),c.POINTER(c.c_size_t),c.c_void_p]
lib.pcre2_code_free_8.argtypes=[c.c_void_p]
lib.pcre2_match_data_create_from_pattern_8.restype=c.c_void_p
lib.pcre2_match_data_create_from_pattern_8.argtypes=[c.c_void_p,c.c_void_p]
lib.pcre2_match_data_free_8.argtypes=[c.c_void_p]
lib.pcre2_jit_compile_8.argtypes=[c.c_void_p,c.c_uint]
lib.pcre2_jit_match_8.argtypes=[c.c_void_p,c.c_char_p,c.c_size_t,c.c_size_t,c.c_uint,c.c_void_p,c.c_void_p]
lib.pcre2_get_ovector_pointer_8.restype=c.POINTER(c.c_size_t)
lib.pcre2_get_ovector_pointer_8.argtypes=[c.c_void_p]
for pattern,subject,expected in [(r'^(?<word>[a-z]+)-(\d+)$','fictional-42',3),(r'^(hola|niño|café)$','niño',2)]:
    pattern=pattern.encode();subject=subject.encode();error=c.c_int();offset=c.c_size_t()
    code=lib.pcre2_compile_8(pattern,len(pattern),0x00080000,c.byref(error),c.byref(offset),None)
    assert code and lib.pcre2_jit_compile_8(code,1)==0
    data=lib.pcre2_match_data_create_from_pattern_8(code,None)
    try:
        assert lib.pcre2_jit_match_8(code,subject,len(subject),0,0,data,None)==expected
        vector=lib.pcre2_get_ovector_pointer_8(data);assert tuple(vector[:2])==(0,len(subject))
        assert lib.pcre2_jit_match_8(code,b'no match!',9,0,0,data,None)==-1
    finally:
        lib.pcre2_match_data_free_8(data);lib.pcre2_code_free_8(code)
error=c.c_int();offset=c.c_size_t()
assert not lib.pcre2_compile_8(b'(',1,0,c.byref(error),c.byref(offset),None)
assert error.value>0
print('PCRE2 native compile/JIT/UTF/capture/invalid-pattern checks passed')
