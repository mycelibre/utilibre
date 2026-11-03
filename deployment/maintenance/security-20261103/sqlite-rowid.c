/* Synthetic upstream negative-rowid case, with legitimate full/column/none
 * searches. No application database, credentials, file or network access. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sqlite3.h"
static void sql(sqlite3 *db,const char *text) {
  char *error=0;
  if(sqlite3_exec(db,text,0,0,&error)!=SQLITE_OK){
    fprintf(stderr,"fixture SQL failed: %s\n",error?error:"unknown");
    sqlite3_free(error);exit(2);
  }
}
int main(void){
  const char *modes[]={"none","column","full"};
  for(int n=0;n<3;n++){
    sqlite3 *db=0;sqlite3_stmt *s=0;char create[128];
    if(sqlite3_open(":memory:",&db)!=SQLITE_OK)return 2;
    snprintf(create,sizeof(create),"CREATE VIRTUAL TABLE t1 USING fts5(x,detail=%s)",modes[n]);sql(db,create);
    sql(db,"WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<55) INSERT INTO t1(rowid,x) SELECT x,'ab' FROM c;");
    sql(db,"INSERT INTO t1(rowid,x) VALUES(-9223372036854775808,'abc');");
    if(sqlite3_prepare_v2(db,"SELECT count(*) FROM t1('a*')",-1,&s,0)!=SQLITE_OK)return 3;
    if(sqlite3_step(s)!=SQLITE_ROW||sqlite3_column_int(s,0)!=56)return 4;
    sqlite3_finalize(s);
    sql(db,"INSERT INTO t1(t1) VALUES('integrity-check');");
    sql(db,"BEGIN; INSERT INTO t1(rowid,x) VALUES(100,'normal'); ROLLBACK;");
    if(sqlite3_prepare_v2(db,"SELECT count(*) FROM t1 WHERE rowid=100",-1,&s,0)!=SQLITE_OK)return 5;
    if(sqlite3_step(s)!=SQLITE_ROW||sqlite3_column_int(s,0)!=0)return 6;
    sqlite3_finalize(s);sqlite3_close(db);
  }
  puts("SQLITE_NEGATIVE_ROWID_AND_NORMAL_SEARCH_PASSED checks=9");
  return 0;
}
