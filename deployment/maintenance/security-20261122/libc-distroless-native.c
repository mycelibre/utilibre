/* Ordinary C-locale checks. This image intentionally has no C.UTF-8 locale
 * data; native Yopass EN/ES tests cover the application's Unicode handling. */
#define _GNU_SOURCE
#include <assert.h>
#include <dlfcn.h>
#include <locale.h>
#include <netdb.h>
#include <pthread.h>
#include <regex.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <wchar.h>
static void *worker(void *p) { return p; }
int main(void) {
    assert(setlocale(LC_ALL, "C"));
    wchar_t wide[16]; assert(mbstowcs(wide,"fixture",16)==7);
    char text[32]; assert(wcstombs(text,wide,32)==7); assert(!strcmp(text,"fixture"));
    int number=0; assert(swscanf(L"42",L"%d",&number)==1 && number==42);
    regex_t re; assert(!regcomp(&re,"^[a-z]+[0-9]+$",REG_EXTENDED));
    assert(!regexec(&re,"fixture42",0,NULL,0)); assert(regexec(&re,"42fixture",0,NULL,0)==REG_NOMATCH);regfree(&re);
    pthread_t thread; void *value=NULL;assert(!pthread_create(&thread,NULL,worker,&number));
    assert(!pthread_join(thread,&value) && value==&number);
    struct addrinfo hints={.ai_family=AF_INET,.ai_flags=AI_NUMERICHOST|AI_NUMERICSERV},*address=NULL;
    assert(!getaddrinfo("127.0.0.1","8080",&hints,&address)); assert(address);freeaddrinfo(address);
    void *lib=dlopen("libc.so.6",RTLD_NOW);assert(lib&&dlsym(lib,"strerror"));dlclose(lib);
    char *copy=strdup("fictional");assert(copy&&!strcmp(copy,"fictional"));free(copy);
    time_t epoch=0;struct tm utc;assert(gmtime_r(&epoch,&utc));assert(utc.tm_year==70&&utc.tm_mon==0);
    assert(strftime(text,sizeof text,"%Y-%m-%d",&utc)==10&&!strcmp(text,"1970-01-01"));
    puts("LIBC_DISTROLESS_PASSED c-locale-wide-scanf-regex-thread-address-loader-memory-time");
    return 0;
}
