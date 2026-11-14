/* Native client round trip against a disposable internal-network PostgreSQL. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(void) {
 void *lib=dlopen("libpq.so.5",RTLD_NOW); assert(lib);
 void *(*connect)(const char *)=dlsym(lib,"PQconnectdb");
 int (*status)(void *)=dlsym(lib,"PQstatus");
 void *(*exec)(void *,const char *)=dlsym(lib,"PQexec");
 int (*resultStatus)(void *)=dlsym(lib,"PQresultStatus");
 char *(*value)(void *,int,int)=dlsym(lib,"PQgetvalue");
 void (*clear)(void *)=dlsym(lib,"PQclear");
 void (*finish)(void *)=dlsym(lib,"PQfinish");
 assert(connect&&status&&exec&&resultStatus&&value&&clear&&finish);
 const char *info=getenv("UTILIBRE_TEST_CONNINFO");assert(info&&strstr(info,"host=fixture-db "));
 void *c=connect(info);assert(c&&status(c)==0);
 void *r=exec(c,"CREATE TEMP TABLE fixture (id integer, label text); INSERT INTO fixture VALUES (42,'Fictional café');");
 assert(resultStatus(r)==1);clear(r);
 r=exec(c,"SELECT id,label FROM fixture");assert(resultStatus(r)==2);
 assert(strcmp(value(r,0,0),"42")==0&&strcmp(value(r,0,1),"Fictional café")==0);clear(r);
 r=exec(c,"BEGIN; UPDATE fixture SET id=7; ROLLBACK;");assert(resultStatus(r)==1);clear(r);
 r=exec(c,"SELECT id FROM fixture");assert(resultStatus(r)==2&&strcmp(value(r,0,0),"42")==0);clear(r);
 r=exec(c,"SELECT missing_column FROM fixture");assert(resultStatus(r)==7);clear(r);
 r=exec(c,"SELECT 2+3");assert(resultStatus(r)==2&&strcmp(value(r,0,0),"5")==0);clear(r);
 finish(c);dlclose(lib);puts("LIBPQ_DATABASE_PASSED checks=6");return 0;
}
