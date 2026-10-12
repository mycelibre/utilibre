/* Bounded loopback ABI/HTTP/TLS fixture, compiled against native Bookworm libc. */
#define _GNU_SOURCE
#include <curl/curl.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static char body[8192];
static size_t used;
static size_t receive(char *p,size_t n,size_t m,void *unused) {
 (void)unused; size_t z=n*m;if(z>sizeof(body)-used-1)return 0;
 memcpy(body+used,p,z);used+=z;body[used]=0;return z;
}
#define LOAD(name) __typeof__(&name) fn_##name=dlvsym(lib,#name,abi); if(!fn_##name)return 2
int main(int argc,char **argv) {
 if(argc!=3)return 2;
 void *lib=dlopen(argv[1],RTLD_NOW|RTLD_LOCAL);if(!lib){fputs(dlerror(),stderr);return 2;}
 const char *abi=strstr(argv[1],"gnutls")?"CURL_GNUTLS_3":"CURL_OPENSSL_4";
 LOAD(curl_global_init);LOAD(curl_global_cleanup);LOAD(curl_easy_init);LOAD(curl_easy_cleanup);
 LOAD(curl_easy_setopt);LOAD(curl_easy_getinfo);LOAD(curl_easy_perform);LOAD(curl_version_info);
 if(fn_curl_global_init(CURL_GLOBAL_DEFAULT))return 2;
 curl_version_info_data *v=fn_curl_version_info(CURLVERSION_NOW);
 if(!(v->features&CURL_VERSION_SSL)||!(v->features&CURL_VERSION_HTTP2))return 3;
 printf("CURL_VERSION=%s\nCURL_FEATURE_MASK=%u\nCURL_PROTOCOLS=",v->version,(unsigned)v->features);
 for(const char *const *p=v->protocols;*p;p++)printf("%s ",*p);
 puts("");
 CURL *c=fn_curl_easy_init();if(!c)return 2;
 fn_curl_easy_setopt(c,CURLOPT_WRITEFUNCTION,receive);
 fn_curl_easy_setopt(c,CURLOPT_TIMEOUT,5L);
 fn_curl_easy_setopt(c,CURLOPT_NOPROXY,"*");
 const char *urls[]={"http://localhost:18080/","http://localhost:18080/redirect","http://localhost:18080/gzip","http://localhost:18080/post","https://localhost:18443/","https://127.0.0.1:18443/","http://localhost:18080/missing"};
 for(unsigned i=0;i<sizeof(urls)/sizeof(urls[0]);i++) {
  used=0;body[0]=0;fn_curl_easy_setopt(c,CURLOPT_URL,urls[i]);
  fn_curl_easy_setopt(c,CURLOPT_FOLLOWLOCATION,1L);
  fn_curl_easy_setopt(c,CURLOPT_MAXREDIRS,3L);
  fn_curl_easy_setopt(c,CURLOPT_ACCEPT_ENCODING,"");
  fn_curl_easy_setopt(c,CURLOPT_CAINFO,argv[2]);
  if(i==3)fn_curl_easy_setopt(c,CURLOPT_POSTFIELDS,"fictional=utilibre");
  else fn_curl_easy_setopt(c,CURLOPT_HTTPGET,1L);
  CURLcode rc=fn_curl_easy_perform(c);long status=0;fn_curl_easy_getinfo(c,CURLINFO_RESPONSE_CODE,&status);
  if(i==5){if(rc!=CURLE_PEER_FAILED_VERIFICATION)return 10+i;continue;}
  if(rc||status!=(i==6?404:200)||strcmp(body,i==3?"fictional=utilibre":i==6?"missing":"fictional transfer\n"))return 10+i;
 }
 fn_curl_easy_cleanup(c);fn_curl_global_cleanup();dlclose(lib);
 puts("CURL_NATIVE_GET_REDIRECT_GZIP_POST_TLS_TRUST_REJECTION_404_PASSED");return 0;
}
