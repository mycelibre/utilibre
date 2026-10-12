import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('/work/sqlite3-3.40.1/test/distinct.test','utf8');
for(let n=1;n<=5;n++) {
  const match=source.match(new RegExp('do_execsql_test 10\\.'+n+' \\{([\\s\\S]*?)\\n\\} \\{'));
  assert(match,'Exact upstream regression case missing');
  writeFileSync('/out/distinct-10.'+n+'.sql',match[1].trim()+'\n');
}
