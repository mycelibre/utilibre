// Prepare exact mounted-source changes; never write into the running CryptPad.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,json,save,hash} from './common.mjs';
const d=root+'/braces',live='/opt/utilibre/src/cryptpad',s=json(d+'/source.json');assert(s.passed);
const files={};function add(relative,bytes){const target=live+'/'+relative,old=fs.existsSync(target)?fs.readFileSync(target):null;const stat=old?fs.statSync(target):{mode:0o644,uid:4001,gid:4001};const source=d+'/integration/'+relative;fs.mkdirSync(new URL('.', 'file://'+source).pathname,{recursive:true});fs.writeFileSync(source,bytes);fs.chmodSync(source,stat.mode&0o777);files[relative]={before:old?hash(old):null,after:hash(bytes),mode:stat.mode&0o777,uid:stat.uid,gid:stat.gid};if(old){const p=d+'/rollback/'+relative;fs.mkdirSync(new URL('.', 'file://'+p).pathname,{recursive:true});fs.writeFileSync(p,old);}}
const pkg=json(live+'/package.json'),lock=json(live+'/package-lock.json');assert.equal(pkg.version,'2026.9.0');assert.equal(lock.packages['node_modules/braces'].version,'3.0.3');assert(!pkg.overrides.braces);assert(!fs.existsSync(live+'/utilibre-vendor/braces-3.0.3-utilibre.1.tgz'));
pkg.overrides.braces='file:utilibre-vendor/braces-3.0.3-utilibre.1.tgz';
Object.assign(lock.packages['node_modules/braces'],{version:s.version,resolved:'file:utilibre-vendor/braces-3.0.3-utilibre.1.tgz',integrity:s.archiveIntegrity});
add('package.json',Buffer.from(JSON.stringify(pkg,null,2)+'\n'));add('package-lock.json',Buffer.from(JSON.stringify(lock,null,2)+'\n'));
for(const row of s.changes){assert.equal(hash(fs.readFileSync(live+'/node_modules/braces/'+row.name)),row.before);add('node_modules/braces/'+row.name,fs.readFileSync(d+'/package/'+row.name));}
add('node_modules/braces/package.json',fs.readFileSync(d+'/package/package.json'));add('utilibre-vendor/braces-3.0.3-utilibre.1.tgz',fs.readFileSync(d+'/braces-3.0.3-utilibre.1.tgz'));
const installed=json(live+'/node_modules/.package-lock.json');assert.equal(installed.packages['node_modules/braces'].version,'3.0.3');installed.packages['node_modules/braces']=lock.packages['node_modules/braces'];add('node_modules/.package-lock.json',Buffer.from(JSON.stringify(installed,null,2)+'\n'));
save(d+'/integration.json',{date:new Date().toISOString(),liveRoot:live,sourceProofSha256:hash(fs.readFileSync(d+'/source.json')),passed:true,deployed:false,files});console.log('Braces mounted-source package and override prepared; no live writes.');
