/* Small regression adapted from libexpat PR #1431's reset-neutrality test
 * (MIT, Expat maintainers). Public limits reduce the fixture to 64 KiB.
 * dlopen permits the same executable to test exact narrow/wide library bytes. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <expat.h>
int main(int argc, char **argv) {
  assert(argc == 2);
  void *lib = dlopen(argv[1], RTLD_NOW | RTLD_LOCAL); assert(lib);
#define FN(name) __typeof__(name) *f_##name = dlsym(lib, #name); assert(f_##name)
  FN(XML_ParserCreate); FN(XML_Parse); FN(XML_ParserReset); FN(XML_ParserFree);
  FN(XML_GetErrorCode); FN(XML_ExpatVersion);
  FN(XML_SetAllocTrackerActivationThreshold);
  XML_Parser parser = f_XML_ParserCreate(NULL); assert(parser);
  const char *small = "<hello/>";
  assert(f_XML_Parse(parser, small, (int)strlen(small), XML_TRUE) == XML_STATUS_OK);
  assert(f_XML_ParserReset(parser, NULL));
  assert(f_XML_SetAllocTrackerActivationThreshold(parser, 16384));
  const size_t n = 65536;
  char *big = malloc(n); assert(big);
  memset(big, 'X', n); memcpy(big, "<doc a='", 8); strcpy(big + n - 4, "'/>");
  for (size_t i = 0; i < n - 1; i++) {
    assert(f_XML_Parse(parser, big + i, 1, i == n - 2) == XML_STATUS_OK);
  }
  free(big);
  assert(f_XML_ParserReset(parser, NULL));
  assert(f_XML_SetAllocTrackerActivationThreshold(parser, 16384));
  int status = f_XML_Parse(parser, small, (int)strlen(small), XML_TRUE);
  enum XML_Error error = f_XML_GetErrorCode(parser);
  printf("{\"version\":\"%s\",\"fixtureBytes\":65536,\"initialSmall\":true,\"large\":true,\"reset\":true,\"afterReset\":%d,\"error\":%d}\n", f_XML_ExpatVersion(), status, error);
  assert(status == XML_STATUS_OK || (status == XML_STATUS_ERROR && error == XML_ERROR_NO_MEMORY));
  f_XML_ParserFree(parser); assert(dlclose(lib) == 0); return 0;
}
