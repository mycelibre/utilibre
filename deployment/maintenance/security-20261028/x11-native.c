/* Synthetic Xlib consumers; no X server, display, documents or network. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
typedef void *DB;
typedef struct { unsigned int size; char *addr; } Value;
int main(void) {
 void *lib=dlopen("libX11.so.6",RTLD_NOW); assert(lib);
 void (*init)(void)=dlsym(lib,"XrmInitialize");
 DB (*parse)(const char *)=dlsym(lib,"XrmGetStringDatabase");
 int (*get)(DB,const char *,const char *,char **,Value *)=dlsym(lib,"XrmGetResource");
 void (*put)(DB *,const char *,const char *)=dlsym(lib,"XrmPutStringResource");
 void (*destroy)(DB)=dlsym(lib,"XrmDestroyDatabase");
 unsigned long (*key)(const char *)=dlsym(lib,"XStringToKeysym");
 char *(*name)(unsigned long)=dlsym(lib,"XKeysymToString");
 int (*geometry)(const char *,int *,int *,unsigned int *,unsigned int *)=dlsym(lib,"XParseGeometry");
 assert(init&&parse&&get&&put&&destroy&&key&&name&&geometry);
 init(); DB db=parse("Example.label: Fictional\nExample.count: 2\n"); assert(db);
 char *type=NULL;Value value={0};
 assert(get(db,"Example.label","Example.Label",&type,&value));assert(strcmp(type,"String")==0&&strcmp(value.addr,"Fictional")==0);
 assert(get(db,"Example.count","Example.Count",&type,&value));assert(strcmp(value.addr,"2")==0);
 put(&db,"Example.label","Changed");assert(get(db,"Example.label","Example.Label",&type,&value)&&strcmp(value.addr,"Changed")==0);
 assert(!get(db,"Example.absent","Example.Absent",&type,&value));
 assert(key("space")==0x20&&strcmp(name(0x20),"space")==0);
 assert(key("not_a_real_keysym_for_this_fixture")==0);
 int x=0,y=0;unsigned int w=0,h=0;
 int flags=geometry("640x480+10-20",&x,&y,&w,&h);assert(flags==47&&x==10&&y==-20&&w==640&&h==480);
 assert(geometry("invalid",&x,&y,&w,&h)==0);
 destroy(db);assert(dlclose(lib)==0);puts("XLIB_NATIVE_8_PASSED");return 0;
}
