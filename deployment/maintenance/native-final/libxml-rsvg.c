/* Native installed librsvg parser through its public API, no runtime headers
 * or language module required. Synthetic local SVG; no external references. */
#include <assert.h>
#include <dlfcn.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
int main(void) {
  void *rsvg=dlopen("librsvg-2.so.2",RTLD_NOW), *gobject=dlopen("libgobject-2.0.so.0",RTLD_NOW);
  assert(rsvg && gobject);
  void *(*create)(const unsigned char *,size_t,void **)=dlsym(rsvg,"rsvg_handle_new_from_data");
  int (*size)(void *,double *,double *)=dlsym(rsvg,"rsvg_handle_get_intrinsic_size_in_pixels");
  void (*release)(void *)=dlsym(gobject,"g_object_unref");
  assert(create && size && release);
  const char *svg="<svg xmlns='http://www.w3.org/2000/svg' width='32' height='24'><rect width='32' height='24' fill='blue'/></svg>";
  void *error=NULL, *handle=create((const unsigned char *)svg,strlen(svg),&error);
  assert(handle && !error);
  double width=0,height=0;
  assert(size(handle,&width,&height) && width==32 && height==24);
  release(handle);dlclose(rsvg);dlclose(gobject);
  puts("installed librsvg native parser and dimensions passed");
  return 0;
}
