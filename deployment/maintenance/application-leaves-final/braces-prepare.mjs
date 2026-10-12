// Local bounded-depth backport while upstream #70 has no released fix.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {root,run,hash,save,floor} from './common.mjs';
const d=root+'/braces';fs.mkdirSync(d,{recursive:true});floor();
const revision='74b2db2938fad48a2ea54a9c8bf27a37a62c350d',url='https://codeload.github.com/micromatch/braces/tar.gz/'+revision;
const r=await fetch(url);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert(bytes.length<1024**2);fs.writeFileSync(d+'/upstream.tar.gz',bytes);
const src=d+'/source';fs.mkdirSync(src,{recursive:true});assert(!fs.existsSync(src+'/package.json'),'Already prepared');assert(run('tar',['-tzf',d+'/upstream.tar.gz']).trim().split('\n').every(p=>p.startsWith('braces-'+revision+'/')&&!p.split('/').includes('..')));run('tar',['--no-same-owner','-xzf',d+'/upstream.tar.gz','--strip-components=1','-C',src]);
const changed=[];function patch(name,pairs){const p=src+'/'+name;let t=fs.readFileSync(p,'utf8');const old=fs.readFileSync('/opt/utilibre/src/cryptpad/node_modules/braces/'+name,'utf8');assert.equal(t,old,'Installed source differs from upstream '+name);for(const[a,b]of pairs){assert.equal(t.split(a).length,2,'Patch context drift '+name);t=t.replace(a,b)}fs.writeFileSync(p,t);changed.push({name,before:hash(old),after:hash(t)});}
patch('lib/constants.js',[['  MAX_LENGTH: 10000,','  MAX_LENGTH: 10000,\n  // Bound recursive AST walkers independently of the character limit.\n  MAX_DEPTH: 256,']]);
patch('lib/parse.js',[['  MAX_LENGTH,','  MAX_LENGTH,\n  MAX_DEPTH,'],["    if (value === CHAR_LEFT_PARENTHESES) {","    if (value === CHAR_LEFT_PARENTHESES) {\n      if (stack.length >= MAX_DEPTH) throw new SyntaxError('Brace nesting exceeds supported depth');"],["    if (value === CHAR_LEFT_CURLY_BRACE) {","    if (value === CHAR_LEFT_CURLY_BRACE) {\n      if (stack.length >= MAX_DEPTH) throw new SyntaxError('Brace nesting exceeds supported depth');"]]);
for(const file of ['compile','expand','stringify']){
 const fn=file==='stringify'?'stringify':'walk';
 patch('lib/'+file+'.js',[["'use strict';","'use strict';\n\nconst { MAX_DEPTH } = require('./constants');"],[`  const ${fn} = (node, parent = {}) => {`,`  const ${fn} = (node, parent = {}, depth = 0) => {\n    if (depth > MAX_DEPTH) throw new SyntaxError('Brace nesting exceeds supported depth');`],[file==='stringify'?'stringify(child)':`walk(child, node)`,file==='stringify'?'stringify(child, {}, depth + 1)':'walk(child, node, depth + 1)']]);
}
const meta=JSON.parse(fs.readFileSync(src+'/package.json'));assert.equal(meta.version,'3.0.3');meta.version='3.0.3-utilibre.1';fs.writeFileSync(src+'/package.json',JSON.stringify(meta,null,2)+'\n');
const pkg=d+'/package';fs.mkdirSync(pkg,{recursive:true});for(const p of ['index.js','lib','package.json','LICENSE','README.md'])fs.cpSync(src+'/'+p,pkg+'/'+p,{recursive:true});
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/braces-3.0.3-utilibre.1.tgz','-C',d,'package']);
const archive=fs.readFileSync(d+'/braces-3.0.3-utilibre.1.tgz');save(d+'/source.json',{date:new Date().toISOString(),url,revision,upstreamSha256:hash(bytes),license:meta.license,changes:changed,version:meta.version,archiveSha256:hash(archive),archiveIntegrity:'sha512-'+createHash('sha512').update(archive).digest('base64'),maxAstDepth:256,passed:true});
// Build-time-only dev dependencies in a private test tree. Never copied to live.
fs.writeFileSync(d+'/test-package.json',JSON.stringify({private:true,devDependencies:{mocha:'11.7.4','ansi-colors':'3.2.4','bash-path':'2.0.1'}}));
console.log(JSON.stringify({prepared:true,changed:changed.map(x=>x.name),sourceBytes:bytes.length,packageBytes:archive.length}));
