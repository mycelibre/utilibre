/* Ordinary XPM file/data round-trip using the published libXpm 3.5.20 ABI.
 * Synthetic 2x2 pixels only; no display, network or vulnerability reproduction. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
int main(void) {
    void *h = dlopen("libXpm.so.4", RTLD_NOW); assert(h);
    int (*read_data)(const char *, char ***) = dlsym(h, "XpmReadFileToData");
    int (*write_data)(const char *, char **) = dlsym(h, "XpmWriteFileFromData");
    void (*free_data)(void *) = dlsym(h, "XpmFree");
    int (*version)(void) = dlsym(h, "XpmLibraryVersion");
    assert(read_data && write_data && free_data && version); assert(version() == 30411);
    char *data[] = {"2 2 2 1", "a c #ffffff", "b c #000000", "ab", "ba"};
    assert(write_data("/tmp/utilibre-fictional.xpm", data) == 0);
    char **copy = NULL; assert(read_data("/tmp/utilibre-fictional.xpm", &copy) == 0);
    assert(copy && strcmp(copy[0], "2 2 2 1") == 0);
    assert(strcmp(copy[3], "ab") == 0 && strcmp(copy[4], "ba") == 0);
    assert(write_data("/tmp/utilibre-roundtrip.xpm", copy) == 0); free_data(copy);
    copy = NULL; assert(read_data("/tmp/utilibre-roundtrip.xpm", &copy) == 0);
    assert(strcmp(copy[3], "ab") == 0 && strcmp(copy[4], "ba") == 0); free_data(copy);
    assert(remove("/tmp/utilibre-fictional.xpm") == 0);
    assert(remove("/tmp/utilibre-roundtrip.xpm") == 0);
    dlclose(h); puts("XPM_NATIVE_PASSED synthetic-pixel-file-roundtrip"); return 0;
}
