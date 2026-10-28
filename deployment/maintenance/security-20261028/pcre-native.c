/* Native library compatibility, adapted from vendor-leaves-final/pcre-native.py.
 * No application input, network or corruption exploit. */
#include <assert.h>
#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
int main(void) {
 void *lib=dlopen("libpcre2-8.so.0",RTLD_NOW); assert(lib);
 void *(*compile)(const unsigned char*,size_t,uint32_t,int*,size_t*,void*)=dlsym(lib,"pcre2_compile_8");
 void *(*data_create)(const void*,void*)=dlsym(lib,"pcre2_match_data_create_from_pattern_8");
 int (*jit_compile)(void*,uint32_t)=dlsym(lib,"pcre2_jit_compile_8");
 int (*jit_match)(const void*,const unsigned char*,size_t,size_t,uint32_t,void*,void*)=dlsym(lib,"pcre2_jit_match_8");
 size_t *(*vector)(void*)=dlsym(lib,"pcre2_get_ovector_pointer_8");
 void (*data_free)(void*)=dlsym(lib,"pcre2_match_data_free_8");
 void (*code_free)(void*)=dlsym(lib,"pcre2_code_free_8");
 assert(compile&&data_create&&jit_compile&&jit_match&&vector&&data_free&&code_free);
 const char *patterns[]={"^(?<word>[a-z]+)-(\\d+)$","^(hola|niño|café)$"};
 const char *subjects[]={"fictional-42","niño"};
 for(int n=0;n<2;n++){
  int error=0;size_t offset=0;
  void *code=compile((const unsigned char*)patterns[n],strlen(patterns[n]),0x00080000,&error,&offset,NULL);assert(code);
  assert(jit_compile(code,1)==0);void *data=data_create(code,NULL);assert(data);
  assert(jit_match(code,(const unsigned char*)subjects[n],strlen(subjects[n]),0,0,data,NULL)==(n?2:3));
  size_t *v=vector(data);assert(v&&v[0]==0&&v[1]==strlen(subjects[n]));
  assert(jit_match(code,(const unsigned char*)"no match!",9,0,0,data,NULL)==-1);
  data_free(data);code_free(code);
 }
 int error=0;size_t offset=0;assert(!compile((const unsigned char*)"(",1,0,&error,&offset,NULL)&&error>0);
 dlclose(lib);puts("PCRE_NATIVE_PASSED");return 0;
}
