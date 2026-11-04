/* Native libXi/XInput consumer against an isolated Xvfb Unix socket.
 * No production display, remote X server, user input or network is used.
 * Public ABI: libXi 1.8.4 XInput.h and XInput2.h. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
int main(int argc, char **argv) {
 assert(argc == 2);
 void *x = dlopen("libX11.so.6", RTLD_NOW | RTLD_GLOBAL); assert(x);
 void *xi = dlopen(argv[1], RTLD_NOW); assert(xi);
 void *(*open_display)(const char *) = dlsym(x, "XOpenDisplay");
 int (*close_display)(void *) = dlsym(x, "XCloseDisplay");
 int (*query_extension)(void *, const char *, int *, int *, int *) = dlsym(x, "XQueryExtension");
 int (*query_version)(void *, int *, int *) = dlsym(xi, "XIQueryVersion");
 void *(*list_devices)(void *, int *) = dlsym(xi, "XListInputDevices");
 void (*free_devices)(void *) = dlsym(xi, "XFreeDeviceList");
 void *(*query_devices)(void *, int, int *) = dlsym(xi, "XIQueryDevice");
 void (*free_info)(void *) = dlsym(xi, "XIFreeDeviceInfo");
 assert(open_display && close_display && query_extension && query_version);
 assert(list_devices && free_devices && query_devices && free_info);
 void *display = open_display(":99"); assert(display);
 int opcode = 0, event = 0, error = 0;
 assert(query_extension(display, "XInputExtension", &opcode, &event, &error));
 assert(opcode > 0 && error > 0);
 int major = 2, minor = 0;
 assert(query_version(display, &major, &minor) == 0 && major >= 2);
 int count = 0;
 void *devices = list_devices(display, &count); assert(devices && count >= 2);
 free_devices(devices);
 count = 0;
 void *info = query_devices(display, 0, &count); assert(info && count >= 2);
 free_info(info);
 /* Repeat native allocation/free to catch simple lifecycle regressions. */
 for (int i = 0; i < 8; i++) {
  info = query_devices(display, 1, &count); assert(info && count >= 2);
  free_info(info);
 }
 assert(close_display(display) == 0);
 assert(dlclose(xi) == 0 && dlclose(x) == 0);
 puts("LIBXI_NATIVE_PASSED checks=14");
 return 0;
}
