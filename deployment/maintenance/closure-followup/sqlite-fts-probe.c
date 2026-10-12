/* Synthetic upstream corrupt database only; use the actual dynamic library. */
#include <sqlite3.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
int main(int argc, char **argv) {
  assert(argc==2);
  assert(!strcmp(sqlite3_libversion(),"3.40.1"));
  sqlite3 *db=NULL;
  assert(sqlite3_open_v2(argv[1],&db,SQLITE_OPEN_READONLY,NULL)==SQLITE_OK);
  char *error=NULL;
  int rc=sqlite3_exec(db,"SELECT rowid FROM t WHERE t MATCH 'a'",NULL,NULL,&error);
  sqlite3_free(error);
  assert(sqlite3_close(db)==SQLITE_OK);
  if(rc!=SQLITE_CORRUPT){fprintf(stderr,"Unexpected synthetic query code: %d\n",rc);return 1;}
  puts("Native FTS5 malformed continuation page rejected with SQLITE_CORRUPT.");
  return 0;
}
