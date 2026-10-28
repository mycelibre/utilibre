/* Public Brotli C API compatibility check, loaded from the tested image.
 * Synthetic data only. This is not reproduction of CVE-2026-111497. */
#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef int (*encode_fn)(int, int, int, size_t, const uint8_t *, size_t *, uint8_t *);
typedef int (*decode_fn)(size_t, const uint8_t *, size_t *, uint8_t *);
int main(void) {
    void *enc = dlopen("libbrotlienc.so.1", RTLD_NOW);
    void *dec = dlopen("libbrotlidec.so.1", RTLD_NOW);
    if (!enc || !dec) return 2;
    encode_fn encode = (encode_fn)dlsym(enc, "BrotliEncoderCompress");
    decode_fn decode = (decode_fn)dlsym(dec, "BrotliDecoderDecompress");
    if (!encode || !decode) return 3;
    const uint8_t input[] = "Fictional Utilibre compression test: texto de prueba, 12345.";
    uint8_t compressed[1024], output[1024], invalid[32];
    size_t length = sizeof(compressed), out = sizeof(output);
    if (!encode(5, 22, 0, sizeof(input), input, &length, compressed)) return 4;
    if (decode(length, compressed, &out, output) != 1 || out != sizeof(input)
        || memcmp(input, output, out)) return 5;
    memset(invalid, 0xff, sizeof(invalid)); out = sizeof(output);
    if (decode(sizeof(invalid), invalid, &out, output) != 0) return 6;
    out = 1;
    if (decode(length, compressed, &out, output) != 0) return 7;
    dlclose(dec); dlclose(enc);
    puts("BROTLI_ROUNDTRIP_CORRUPT_INPUT_AND_OUTPUT_BOUND_PASSED");
    return 0;
}
