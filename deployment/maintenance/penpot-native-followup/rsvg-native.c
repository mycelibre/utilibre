/* Compiled against the original 2.60.0 public headers. No remote resources. */
#define _GNU_SOURCE
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <librsvg/rsvg.h>
int main(int argc,char **argv) {
    assert(argc==2 || argc==3);
    GError *error=NULL;
    RsvgHandle *handle=rsvg_handle_new_from_file(argv[1],&error);
    if (!handle) { fprintf(stderr,"fixture parse failed: %s\n",error?error->message:"unknown"); return 2; }
    assert(!error);
    double width=0,height=0;
    assert(rsvg_handle_get_intrinsic_size_in_pixels(handle,&width,&height));
    assert(width==32 && height==24);
    cairo_surface_t *surface=cairo_image_surface_create(CAIRO_FORMAT_ARGB32,32,24);
    cairo_t *cr=cairo_create(surface);
    RsvgRectangle viewport={0,0,32,24};
    assert(rsvg_handle_render_document(handle,cr,&viewport,&error) && !error);
    assert(cairo_surface_write_to_png(surface,"/tmp/rsvg-native-result.png")==CAIRO_STATUS_SUCCESS);
    cairo_destroy(cr);cairo_surface_destroy(surface);g_object_unref(handle);
    if(argc==3) {
        unsigned int (*count)(void)=dlsym(RTLD_DEFAULT,"utilibre_entity_count");
        assert(count);
        unsigned int actual=count(),expected=(unsigned int)strtoul(argv[2],NULL,10);
        printf("duplicate entity allocations: %u\n",actual);
        assert(actual==expected);
    }
    puts("old-header native SVG parse, intrinsic dimensions and Cairo render passed");
    return 0;
}
