/* Bounded native API compatibility/rejection check; no network or real data.
 * GLib upstream interface: gio/gdbusintrospection.c, version 2.86.5.
 * These small synthetic XML documents are not an exploitability assessment. */
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
typedef struct { unsigned domain; int code; char *message; } Error;
int main(void) {
  void *lib = dlopen("libgio-2.0.so.0", RTLD_NOW);
  if (!lib) { fputs("Native GIO loader failed\n", stderr); return 1; }
  void *(*parse)(const char *, Error **) = dlsym(lib,"g_dbus_node_info_new_for_xml");
  void *(*lookup)(void *, const char *) = dlsym(lib,"g_dbus_node_info_lookup_interface");
  void (*unref)(void *) = dlsym(lib,"g_dbus_node_info_unref");
  void (*clear)(Error *) = dlsym(lib,"g_error_free");
  if (!parse || !lookup || !unref || !clear) return 2;
  const char *good = "<node><interface name='org.utilibre.Test'><method name='Echo'><arg name='input' type='s' direction='in'/><arg name='output' type='s' direction='out'/></method><signal name='Changed'><arg type='s'/></signal><property name='Label' type='s' access='read'/></interface></node>";
  Error *error = NULL;
  void *node = parse(good, &error);
  if (!node || error || !lookup(node,"org.utilibre.Test")) return 3;
  unref(node);
  const char *bad[] = {
    "<node><interface name='org.utilibre.Test'><node/></interface></node>",
    "<node><interface name='org.utilibre.Test'><method name='Echo'><node/></method></interface></node>",
    "<node><interface name='org.utilibre.Test'><signal name='Changed'><node/></signal></interface></node>",
    "<node><interface name='org.utilibre.Test'><property name='Label' type='s' access='read'><node/></property></interface></node>",
    "<node><interface name='org.utilibre.Test'><method name='Echo'><arg type='s'><node/></arg></method></interface></node>",
    "<node><interface name='org.utilibre.Test'><method name='Echo'><arg/></method></interface></node>",
    "<node><interface name='org.utilibre.Test'>"
  };
  for (unsigned i=0; i<sizeof(bad)/sizeof(bad[0]); i++) {
    error=NULL; node=parse(bad[i], &error);
    if (node || !error) { fprintf(stderr,"Malformed case %u was accepted\n",i); return 4; }
    clear(error);
  }
  dlclose(lib); puts("Native GIO: valid interface and seven malformed documents passed");
  return 0;
}
