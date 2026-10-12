/* Synthetic native release test only; never installed in an application. */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <expat.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
static unsigned int calls, nonzero_calls;
unsigned int utilibre_entropy_calls(void) { return calls; }
unsigned int utilibre_nonzero_entropy_calls(void) { return nonzero_calls; }
XML_Bool XML_SetHashSalt16Bytes(XML_Parser parser, const uint8_t entropy[16]) {
    static XML_Bool (*original)(XML_Parser, const uint8_t[16]);
    if (!original) original = dlsym(RTLD_NEXT, "XML_SetHashSalt16Bytes");
    if (!original) abort();
    unsigned int nonzero = 0;
    for (size_t i = 0; i < 16; i++) nonzero |= entropy[i];
    calls++;
    if (nonzero) nonzero_calls++;
    return original(parser, entropy);
}
