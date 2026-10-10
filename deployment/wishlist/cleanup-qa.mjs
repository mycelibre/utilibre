// Remove only the explicitly named disposable native account; preserves identity-provider state.
import assert from 'node:assert/strict';import {readFile,writeFile,rename} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const state=JSON.parse(await readFile('/opt/utilibre/wishlist/private/admin-browser.json','utf8'));const cookie=state.cookies.find(x=>x.name==='wishlist_session'&&x.domain==='wishlist.utilibre.org');assert(cookie);
const query="import sqlite3; c=sqlite3.connect('file:/opt/utilibre/wishlist/data/prod.db?mode=ro',uri=True); r=c.execute(\"SELECT id FROM user WHERE username='utilibre-check-a'\").fetchone(); print(r[0] if r else '')";
const id=execFileSync('python3',['-c',query],{encoding:'utf8'}).trim();assert(/^[a-z0-9]+$/.test(id));
const response=await fetch('https://wishlist.utilibre.org/api/users/'+id,{method:'DELETE',headers:{Cookie:'wishlist_session='+cookie.value,Origin:'https://wishlist.utilibre.org'}});assert.equal(response.status,200);assert.equal(execFileSync('python3',['-c',query],{encoding:'utf8'}).trim(),'');
await writeFile('/opt/utilibre/reports/wishlist-20261009/qa-cleanup.json',JSON.stringify({checkedAt:new Date().toISOString(),nativeAdminAccountDeletion:true,qaAccountAbsent:true},null,2));
try{await rename('/opt/utilibre/reports/wishlist-20261009/fixture.json','/opt/utilibre/reports/wishlist-20261009/cleaned-fixture-'+Date.now()+'.json');}catch{}
console.log('Only Wishlist disposable QA account deleted through native admin API.');
