// Only exact reviewed same-major native modules; do not rewrite app bundles.
const fs=require('node:fs'),assert=require('node:assert/strict');
assert.equal(require('/grist/package.json').version,'1.7.21');
const dependencies='/opt/utilibre-grist-reviewed-leaves/node_modules';
const rows=[
 ['/grist/node_modules/axios','1.18.0','axios'],
 ['/grist/node_modules/brace-expansion','1.1.11','brace-expansion'],
 ['/grist/node_modules/typeorm/node_modules/brace-expansion','2.0.2','brace-expansion-v2'],
 ['/grist/node_modules/zip-stream/node_modules/brace-expansion','2.0.2','brace-expansion-v2'],
 ['/usr/local/lib/node_modules/npm/node_modules/brace-expansion','2.0.2','brace-expansion-v2'],
 ['/grist/node_modules/engine.io-client/node_modules/ws','8.17.1','ws'],
 ['/grist/node_modules/engine.io/node_modules/ws','8.18.3','ws'],
 ['/grist/node_modules/engine.io','6.6.7','engine.io'],
 ['/grist/node_modules/fast-uri','3.1.5','fast-uri'],
 ['/grist/node_modules/js-yaml','4.3.1','js-yaml'],
 ['/grist/node_modules/xmlbuilder2/node_modules/js-yaml','3.14.0','js-yaml-v3'],
 ['/grist/node_modules/jws','4.0.0','jws'],
 ['/grist/node_modules/jsonwebtoken/node_modules/jws','3.2.2','jws-v3'],
 ['/grist/node_modules/path-to-regexp','0.1.12','path-to-regexp'],
 ['/grist/node_modules/undici','6.28.0','undici'],
 ['/usr/local/lib/node_modules/npm/node_modules/ip-address','10.1.0','ip-address'],
 ['/usr/local/lib/node_modules/npm/node_modules/picomatch','4.0.3','picomatch'],
];
// Validate all before any removal; nested axios form-data is removed with axios
// and replaced by the exact locked form-data 4.0.6 dependency via resolution.
assert.equal(require('/grist/node_modules/axios/node_modules/form-data/package.json').version,'4.0.5');
for(const [target,old] of rows){assert(!fs.lstatSync(target).isSymbolicLink());assert.equal(require(target+'/package.json').version,old,target);}
for(const [target,old,name] of rows){
 fs.rmSync(target,{recursive:true});fs.cpSync(dependencies+'/'+name,target,{recursive:true});
 // Preserve a physical node_modules directory where the base had nested
 // vulnerable packages. A parent symlink can leave lower-layer inventories.
 if(target==='/grist/node_modules/axios'||target==='/grist/node_modules/engine.io'){
  fs.mkdirSync(target+'/node_modules',{recursive:true});
  const own=JSON.parse(fs.readFileSync(target+'/package.json')).dependencies||{};
  for(const dependency of Object.keys(own)){
   const dest=target+'/node_modules/'+dependency;fs.mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});
   if(dependency==='form-data'||dependency==='ws')fs.cpSync(dependencies+'/'+dependency,dest,{recursive:true});
   else fs.symlinkSync(dependencies+'/'+dependency,dest);
  }
 }else if(!fs.existsSync(target+'/node_modules'))fs.symlinkSync(dependencies,target+'/node_modules');
 assert.equal(JSON.parse(fs.readFileSync(target+'/package.json')).version,JSON.parse(fs.readFileSync(dependencies+'/'+name+'/package.json')).version);
}
assert.equal(JSON.parse(fs.readFileSync('/grist/node_modules/axios/node_modules/form-data/package.json')).version,'4.0.6');
fs.mkdirSync('/usr/local/share/utilibre-language',{recursive:true});
fs.writeFileSync('/usr/local/share/utilibre-language/grist-modules.json',JSON.stringify(rows.map(([path,old,name])=>({path,old,current:JSON.parse(fs.readFileSync(dependencies+'/'+name+'/package.json')).version})),null,2)+'\n');
