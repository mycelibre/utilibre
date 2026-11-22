/* Ordinary bounded liblzma operations; no malformed large-input reproduction. */
#include <lzma.h>
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    const uint8_t input[] = "Utilibre fictional backup: café, lunes, 123.\n";
    uint8_t encoded[4096], output[4096];
    size_t length = 0, read_at = 0, write_at = 0;
    uint64_t memory = 16 * 1024 * 1024;
    assert(lzma_version_number() >= 50080000);
    assert(lzma_check_is_supported(LZMA_CHECK_CRC64));
    assert(lzma_stream_buffer_bound(sizeof input) < sizeof encoded);
    assert(lzma_easy_buffer_encode(1, LZMA_CHECK_CRC64, NULL, input, sizeof input,
                                  encoded, &length, sizeof encoded) == LZMA_OK);
    assert(length > 0 && length < sizeof encoded);
    assert(lzma_stream_buffer_decode(&memory, 0, NULL, encoded, &read_at, length,
                                    output, &write_at, sizeof output) == LZMA_OK);
    assert(read_at == length && write_at == sizeof input);
    assert(memcmp(input, output, sizeof input) == 0);
    /* Tiny output capacity is rejected without touching a caller's guard. */
    memset(output, 0xa5, sizeof output); read_at = 0; write_at = 0;
    memory = 16 * 1024 * 1024;
    assert(lzma_stream_buffer_decode(&memory, 0, NULL, encoded, &read_at, length,
                                    output, &write_at, 1) == LZMA_BUF_ERROR);
    assert(output[1] == 0xa5 && write_at == 0 && read_at == 0);
    /* Ordinary checksum rejection; deliberately bounded, not an exploit. */
    encoded[length - 1] ^= 1; read_at = 0; write_at = 0; memory = 16 * 1024 * 1024;
    assert(lzma_stream_buffer_decode(&memory, 0, NULL, encoded, &read_at, length,
                                    output, &write_at, sizeof output) == LZMA_DATA_ERROR);
    puts("LZMA_NATIVE_PASSED checks=7");
    return 0;
}
