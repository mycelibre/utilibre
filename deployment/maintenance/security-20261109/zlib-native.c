#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
int main(void) {
 void *h=dlopen("libz.so.1",RTLD_NOW); assert(h);
 int (*compress)(unsigned char *,unsigned long *,const unsigned char *,unsigned long,int)=dlsym(h,"compress2");
 int (*uncompress)(unsigned char *,unsigned long *,const unsigned char *,unsigned long)=dlsym(h,"uncompress");
 unsigned long (*crc)(unsigned long,const unsigned char *,unsigned int)=dlsym(h,"crc32");
 assert(compress&&uncompress&&crc);
 unsigned char input[65536],packed[70000],out[65536];
 for(unsigned int i=0;i<sizeof(input);i++)input[i]=(unsigned char)(i%251);
 unsigned long n=sizeof(packed),m=sizeof(out);
 assert(compress(packed,&n,input,sizeof(input),6)==0);
 assert(n<sizeof(input)); assert(uncompress(out,&m,packed,n)==0);
 assert(m==sizeof(input)&&memcmp(input,out,m)==0);
 m=8;assert(uncompress(out,&m,packed,n)==-5);
 packed[0]^=255;m=sizeof(out);assert(uncompress(out,&m,packed,n)==-3);
 assert(crc(0,(unsigned char *)"123456789",9)==0xcbf43926UL);
 puts("ZLIB_NATIVE_PASSED checks=7");dlclose(h);return 0;
}
