/* Fictional fixtures only. Uses the image's dynamically linked libsqlite3. */
#include <sqlite3.h>
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static int rows, columns;
static char first[256];
static int collect(void *unused, int n, char **values, char **names) {
  (void)unused; (void)names;
  if (!rows && n) snprintf(first, sizeof first, "%s", values[0] ? values[0] : "NULL");
  rows++; columns=n; return 0;
}
static void query(sqlite3 *db, const char *sql) {
  rows=columns=0; first[0]=0;
  char *error=NULL;
  int rc=sqlite3_exec(db,sql,collect,NULL,&error);
  if(rc!=SQLITE_OK) { fprintf(stderr,"Synthetic SQLite query failed (%d)\n",rc); sqlite3_free(error); exit(1); }
}
int main(int argc,char **argv) {
  if(argc==2 && !strcmp(argv[1],"--options")) {
    for(int n=0;sqlite3_compileoption_get(n);n++) puts(sqlite3_compileoption_get(n));
    return 0;
  }
  assert(argc==6);
  assert(!strcmp(sqlite3_libversion(),"3.40.1"));
  sqlite3 *db=NULL; assert(sqlite3_open(":memory:",&db)==SQLITE_OK);
  for(int n=1;n<=5;n++) {
    FILE *f=fopen(argv[n],"rb"); assert(f);
    char sql[16384];size_t length=fread(sql,1,sizeof(sql)-1,f);assert(!ferror(f)&&feof(f));fclose(f);sql[length]=0;
    query(db,sql);
    if(n==1) {assert(rows==1&&columns==65&&!strcmp(first,"1"));}
    else if(n==2||n==3) {assert(rows>1&&!strcmp(first,"0"));}
    else {assert(rows==1&&!strcmp(first,"1"));}
  }
  query(db,"CREATE TABLE fictional(id INTEGER PRIMARY KEY,label TEXT,n REAL,b BLOB); INSERT INTO fictional VALUES(1,'Ficción — café',12.34,x'001122ff'); BEGIN;UPDATE fictional SET n=99;ROLLBACK; SELECT label FROM fictional WHERE n=12.34 AND hex(b)='001122FF';");
  assert(rows==1&&!strcmp(first,"Ficción — café"));
  sqlite3 *restored=NULL; assert(sqlite3_open(":memory:",&restored)==SQLITE_OK);
  sqlite3_backup *backup=sqlite3_backup_init(restored,"main",db,"main");assert(backup);
  assert(sqlite3_backup_step(backup,-1)==SQLITE_DONE);assert(sqlite3_backup_finish(backup)==SQLITE_OK);
  query(restored,"PRAGMA integrity_check"); assert(rows==1&&!strcmp(first,"ok"));
  query(restored,"SELECT label FROM fictional WHERE n=12.34");assert(rows==1&&!strcmp(first,"Ficción — café"));
  assert(sqlite3_close(db)==SQLITE_OK);assert(sqlite3_close(restored)==SQLITE_OK);
  puts("Five exact upstream regression queries, Unicode/blob/rollback, native backup/restore and integrity passed.");
  return 0;
}
