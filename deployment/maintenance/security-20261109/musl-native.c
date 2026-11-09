/* Synthetic libc compatibility checks, not an oversized-regex exploit test. */
#include <assert.h>
#include <locale.h>
#include <netdb.h>
#include <pthread.h>
#include <regex.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>
#include <wchar.h>
static void *worker(void *p) { return p; }
int main(void) {
 regex_t r; regmatch_t m[2];
 assert(regcomp(&r,"^([a-z]+)-[0-9]{2}$",REG_EXTENDED)==0);
 assert(regexec(&r,"example-42",2,m,0)==0 && m[1].rm_so==0 && m[1].rm_eo==7);
 assert(regexec(&r,"example-other",0,NULL,0)==REG_NOMATCH);regfree(&r);
 assert(regcomp(&r,"hello",REG_ICASE|REG_EXTENDED)==0);
 assert(regexec(&r,"HELLO",0,NULL,0)==0);regfree(&r);
 assert(regcomp(&r,"[",REG_EXTENDED)!=0);
 assert(regcomp(&r,"a{3,2}",REG_EXTENDED)!=0);
 assert(setlocale(LC_ALL,"C.UTF-8"));wchar_t wc=0;mbstate_t state={0};
 assert(mbrtowc(&wc,"\xc3\xb1",2,&state)==2 && wc==0xf1);
 char *p=malloc(64);assert(p);memset(p,42,64);p=realloc(p,128);assert(p&&p[63]==42);free(p);
 int fds[2];char buf[8]={0};assert(socketpair(AF_UNIX,SOCK_STREAM,0,fds)==0);
 assert(write(fds[0],"fixture",7)==7&&read(fds[1],buf,7)==7&&strcmp(buf,"fixture")==0);close(fds[0]);close(fds[1]);
 struct addrinfo hints={.ai_flags=AI_NUMERICHOST,.ai_socktype=SOCK_STREAM},*answer=NULL;
 assert(getaddrinfo("127.0.0.1","80",&hints,&answer)==0&&answer);freeaddrinfo(answer);
 pthread_t thread;void *result=NULL;assert(pthread_create(&thread,NULL,worker,&state)==0);assert(pthread_join(thread,&result)==0&&result==&state);
 puts("MUSL_NATIVE_PASSED regex locale allocation local-socket numeric-address thread");return 0;
}
