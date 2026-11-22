/* Synthetic native API checks. No X server, user fonts or network access. */
#include <X11/fonts/fontenc.h>
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
    assert(argc == 2);
    if (strcmp(argv[1], "boundary") == 0) {
        FontEncPtr encoding = FontEncFind("utilibre-boundary", "/work/fixtures/font.pcf");
        assert(encoding != NULL);
        assert(FontMapFind(encoding, FONT_ENCODING_UNICODE, 0, 0) != NULL);
        puts("FONTENC_BOUNDARY_PASSED");
        return 0;
    }
    assert(strcmp(argv[1], "ordinary") == 0);
    FontMapPtr latin = FontEncMapFind("iso8859-1", FONT_ENCODING_UNICODE, 0, 0, NULL);
    assert(latin != NULL);
    assert(FontEncRecode('A', latin) == 'A');
    assert(FontEncRecode(0xf1, latin) == 0xf1);
    FontEncPtr encoding = FontEncFind("utilibre-ordinary", "/work/fixtures/font.pcf");
    assert(encoding != NULL);
    FontMapPtr mapping = FontMapFind(encoding, FONT_ENCODING_UNICODE, 0, 0);
    assert(mapping != NULL);
    assert(FontEncRecode(0x41, mapping) == 0x391);
    assert(FontEncRecode(0x42, mapping) == 0x392);
    assert(FontEncRecode(0x43, mapping) == 0x393);
    char **names = FontEncIdentify("/work/fixtures/ordinary.enc");
    assert(names && names[0] && strcmp(names[0], "utilibre-ordinary") == 0);
    for (char **p = names; *p; p++) free(*p);
    free(names);
    assert(FontEncIdentify("/work/fixtures/missing.enc") == NULL);
    FontMapReversePtr reverse = FontMapReverse(mapping);
    assert(reverse != NULL && reverse->reverse(0x391, reverse->data) == 0x41);
    /* Upstream keeps mapping state for process lifetime; this short-lived
       fixture ends here, as real X server consumers do on shutdown. */
    puts("FONTENC_ORDINARY_PASSED checks=10");
    return 0;
}
