// Change only a reviewed pinned generator, then version its immutable asset URLs.
// Readable corresponding-source patches use exactly the same helper body.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile,rename} from 'node:fs/promises';
const kind=process.argv[2];
assert(['omnitools','ittools'].includes(kind),'Select the pinned application');
const filename=kind==='omnitools'?'index-D21ZdBbA-utilibre-p5.js':'token-generator.service-d41338d3.js';
const digest=kind==='omnitools'?'23b4334e4d85f1da97109ecd601873605c387ea935bcaefa178f025971ead2cf':'50e25510c5987451b43e518e0f968ac56aaf453ee632646c6a346e831ae8a8d5';
const file='assets/'+filename;
let text=await readFile(file,'utf8');
assert.equal(createHash('sha256').update(text).digest('hex'),digest,'Review changed upstream generator before building');
const helper=(await readFile(new URL('./secure-random.mjs',import.meta.url),'utf8')).replace('export function','function');
const old=kind==='omnitools'?'let n="";for(let e=0;e<r;e++){const m=Math.floor(Math.random()*t.length);n+=t[m]}return n':'return n(u.repeat(e)).substring(0,e)';
const replacement=kind==='omnitools'?'return utilibreSecureToken(t,r)':'return utilibreSecureToken(u,e)';
assert.equal(text.split(old).length,2,'Expected one generator replacement');
text=helper+'\n'+text.replace(old,replacement);
await writeFile(file,text);
const names=(await readdir('assets')).filter(n=>/\.(js|css)$/.test(n));
const version=kind==='omnitools'?'p6':'p2';
const versions=new Map(names.map(n=>[n,n.replace(/(?:-utilibre-p\d+)?\.(js|css)$/,`-utilibre-${version}.$1`)]));
for(const path of ['index.html',...names.map(n=>'assets/'+n)]){
 let content=await readFile(path,'utf8');
 for(const [oldName,newName]of versions)content=content.replaceAll(oldName,newName);
 await writeFile(path,content);
}
for(const [oldName,newName]of versions)if(oldName!==newName)await rename('assets/'+oldName,'assets/'+newName);
console.log(`${kind}: one pinned generator replaced with WebCrypto rejection sampling; immutable URLs versioned.`);
