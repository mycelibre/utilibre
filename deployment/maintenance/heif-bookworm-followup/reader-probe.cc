// Diagnostic wrapper for a disposable synthetic GDAL fixture only. Never deployed.
#include <libheif/heif.h>
#include <cstdio>
#include <dlfcn.h>
struct Trace { const heif_reader* original; void* data; };
static int64_t position(void*u){auto*t=(Trace*)u;auto r=t->original->get_position(t->data);fprintf(stderr,"position=%lld\n",(long long)r);return r;}
static int read(void*p,size_t n,void*u){auto*t=(Trace*)u;auto r=t->original->read(p,n,t->data);fprintf(stderr,"read=%zu status=%d\n",n,r);return r;}
static int seek(int64_t n,void*u){auto*t=(Trace*)u;auto r=t->original->seek(n,t->data);fprintf(stderr,"seek=%lld status=%d\n",(long long)n,r);return r;}
static heif_reader_grow_status wait(int64_t n,void*u){auto*t=(Trace*)u;auto r=t->original->wait_for_file_size(n,t->data);fprintf(stderr,"wait=%lld status=%d\n",(long long)n,r);return r;}
extern "C" heif_error heif_context_read_from_reader(heif_context*c,const heif_reader*r,void*u,const heif_reading_options*o){
 auto real=(decltype(&heif_context_read_from_reader))dlsym(RTLD_NEXT,"heif_context_read_from_reader");
 // Original reader outlives call; this trace is intentionally leaked until this
 // short-lived fixture exits because the library retains callbacks for decode.
 auto*t=new Trace{r,u};auto* wrapped=new heif_reader{1,position,read,seek,wait};
 return real(c,wrapped,t,o);
}
