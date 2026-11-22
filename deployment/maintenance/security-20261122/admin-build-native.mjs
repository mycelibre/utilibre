// Ordinary native build checks only; no development listener or exploit input.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const inputs=JSON.parse(fs.readFileSync('/inputs.json'));
const paths=inputs.rows[0].paths;
const phase=process.argv[2];assert(['before','after'].includes(phase));
const versions={};
for(const [name,[dir]]of Object.entries(paths)){
 const m=JSON.parse(fs.readFileSync(dir+'/package.json'));
 assert.equal(m.name,name);
 assert.equal(m.version,phase==='after'?inputs.packages[name].version:inputs.rows[0].packages[name].installed);
 versions[name]=m.version;
}
const req=createRequire(paths.vite[0]+'/package.json');
const verifyRequire=createRequire('/verification-semver/package.json');
assert.equal(verifyRequire('./package.json').version,inputs.verificationSemver.version);
const semver=verifyRequire('./index.js');
const dependencies=[];
for(const [name,[dir]]of Object.entries(paths)){
 const m=JSON.parse(fs.readFileSync(dir+'/package.json')),resolve=createRequire(dir+'/package.json');
 for(const [dep,range]of Object.entries(m.dependencies||{})){
  let filename;
  try{filename=resolve.resolve(dep+'/package.json');}
  catch{
   let d=path.dirname(resolve.resolve(dep));
   while(!fs.existsSync(d+'/package.json')){assert(d!=='/');d=path.dirname(d);}
   filename=d+'/package.json';
  }
  const installed=JSON.parse(fs.readFileSync(filename));
  assert.equal(installed.name,dep);assert(semver.satisfies(installed.version,range),name+' -> '+dep);
  dependencies.push({name,dep,range,version:installed.version});
 }
}
fs.mkdirSync('/tmp/practice',{recursive:true});
fs.writeFileSync('/tmp/practice/main.ts','export const total: number = 7 * 6;\n');
const vite=await import(pathToFileURL(paths.vite[0]+'/dist/node/index.js'));
const output=await vite.build({configFile:false,root:'/tmp/practice',logLevel:'silent',
 build:{write:false,minify:false,lib:{entry:'/tmp/practice/main.ts',formats:['es'],fileName:'practice'}}});
const built=(Array.isArray(output)?output:[output]).flatMap(o=>o.output).find(o=>o.type==='chunk');
assert(built&&built.code.includes('42'));
const evaluated=await import('data:text/javascript;base64,'+Buffer.from(built.code).toString('base64'));
assert.equal(evaluated.total,42);
const postcss=req('postcss');const css=await postcss([]).process('.sample { color: blue; }',{from:undefined});
assert(css.css.includes('color: blue'));
const nanoid=createRequire(paths.postcss[0]+'/package.json')('nanoid');
assert.equal(nanoid.customAlphabet('abcd',12)().length,12);
console.log(JSON.stringify({passed:true,phase,versions,dependencies,nativeRolldownBuild:true,
 typescriptOutputExecuted:true,postcss:true,nanoid:true,network:'none',developmentServerStarted:false}));
