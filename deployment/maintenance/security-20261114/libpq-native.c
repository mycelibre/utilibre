/* Ordinary libpq compatibility fixture. No live server or hostile input. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
#include <stddef.h>
int main(void) {
    void *lib = dlopen("libpq.so.5", RTLD_NOW);
    assert(lib);
    int (*version)(void) = dlsym(lib, "PQlibVersion");
    void *(*parse)(const char *, char **) = dlsym(lib, "PQconninfoParse");
    void (*freeinfo)(void *) = dlsym(lib, "PQconninfoFree");
    void (*freemem)(void *) = dlsym(lib, "PQfreemem");
    size_t (*escape)(char *, const char *, size_t) = dlsym(lib, "PQescapeString");
    unsigned char *(*unescape)(const unsigned char *, size_t *) = dlsym(lib, "PQunescapeBytea");
    assert(version && parse && freeinfo && freemem && escape && unescape);
    assert(version() >= 170011);
    char *error = NULL;
    void *info = parse("host=127.0.0.1 port=5432 dbname=fictional sslmode=require", &error);
    assert(info && !error); freeinfo(info);
    info = parse("postgresql://fictional@localhost/fixture?sslmode=verify-full", &error);
    assert(info && !error); freeinfo(info);
    info = parse("unknown_fixture_option=value", &error);
    assert(!info && error); freemem(error);
    char output[64];
    assert(escape(output, "O'Brien", 7) == 8 && strcmp(output, "O''Brien") == 0);
    size_t length = 0;
    unsigned char *data = unescape((const unsigned char *)"\\x006162ff", &length);
    assert(data && length == 4 && memcmp(data, "\0ab\xff", 4) == 0);
    freemem(data);
    printf("LIBPQ_NATIVE_PASSED version=%d checks=5\n", version());
    dlclose(lib);
    return 0;
}
