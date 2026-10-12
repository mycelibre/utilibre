// Equivalent to spliit-no-flags.patch for this exact pinned compiled build.
// No runtime rewriting, proxy or external image replacement is introduced.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
if(process.argv[2]!=='/usr/app/node_modules/mysql2')process.exit(0);
const files=['/usr/app/.next/server/chunks/ssr/_0ze3y-h._.js','/usr/app/.next/server/chunks/ssr/_1bkjedk._.js','/usr/app/.next/static/chunks/3m-0x3ae8tu5n.js'];
const expected=['4660ca9c5e79386b22959587df9a7f24a0251230863ba45abedb7d03960ab31d','fccae16f63cf843346da0fa68ade119db3136c73b5f1241e04b2c0e0d0f7f42a','1d384ed378fdd35c33844b056addee1345de97d1e15e7f167c36b3d736215b79'];
const rows=[];
for(const p of files){
 const original=fs.readFileSync(p,'utf8');
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),expected[files.indexOf(p)],p);
 const expression=p.includes('/static/')?'(0,t.jsx)("img",{src:l,className:"w-4",alt:""})':'(0,b.jsx)("img",{src:c,className:"w-4",alt:""})';
 assert.equal(original.split(expression).length,2,p);
 const urls=original.match(/`https:\/\/flagcdn\.com\/h24\/\$\{[^}]+\}\.png`/g);assert.equal(urls?.length,1,p);
 const changed=original.replace(expression,'null').replace(urls[0],'""');assert(!changed.includes('flagcdn.com'));
 fs.writeFileSync(p,changed);
 rows.push({path:p,before:crypto.createHash('sha256').update(original).digest('hex'),after:crypto.createHash('sha256').update(changed).digest('hex')});
}
fs.writeFileSync('/usr/local/share/utilibre-language/spliit-no-flags.json',JSON.stringify({reason:'Remove external decorative flags; preserve currency names and codes',rows},null,2)+'\n');
