// Native npm archive dependency only; use a disposable network-none container
// with /tmp tmpfs. Never unpack into a production document directory.
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const path='/usr/local/lib/node_modules/npm/node_modules/tar';
assert.equal(require(path+'/package.json').version,'7.5.21');
const tar=require(path);
(async()=>{
 await fs.mkdir('/tmp/source');await fs.mkdir('/tmp/result');
 await fs.writeFile('/tmp/source/example.txt','Fictional café');
 await tar.c({cwd:'/tmp/source',file:'/tmp/example.tar'},['example.txt']);
 await tar.x({cwd:'/tmp/result',file:'/tmp/example.tar'});
 assert.equal(await fs.readFile('/tmp/result/example.txt','utf8'),'Fictional café');
 console.log('npm tar 7.5.21 archive/read/extract round trip passed.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
