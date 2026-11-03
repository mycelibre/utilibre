// Existing native-ABI/configuration gate, scoped to the finite Expat release.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const debian=process.argv.includes('--debian'),profile=debian?'expat-debian':'expat';process.argv=process.argv.filter(a=>a!=='--debian');
const root='/var/lib/utilibre-maintenance/security-20261103/'+profile,inputs=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url))),pins=JSON.parse(fs.readFileSync(new URL('./'+profile+'-fixture.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(new URL('./expat-native.c',import.meta.url))),pins.sourceSha256);
assert.equal(sha(fs.readFileSync(root+'/fixture/native')),pins.binarySha256);
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const limits=['--rm','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--memory-swap','128m','--cpus','.5','--pids-limit','32','--log-driver','none'];
for(const key of keys){
 const s=inputs.rows.find(s=>s.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json')),fixture=root+'/'+(s.suite==='bookworm'?'fixture-bookworm':'fixture'),actualPins=s.suite==='bookworm'?{...pins,...pins.bookworm}:pins;
 assert(b.passed&&b.base===s.base&&b.fixtureSha256===actualPins.binarySha256);
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...o});}catch(e){fs.writeFileSync(dir+'/consumer-error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': native consumer failed; private diagnostics retained');}};
 const abi=[];
 for(const library of [...(debian?['libexpat','libexpatw']:['libexpat']),...(s.bundledLibrary?['bundled-expat']:[])]){
 const pair=[];
 for(const [state,image]of [['before',b.base],['after',b.imageId]]){
  const bytes=run('docker',['run',...limits,'--network','none','--entrypoint','cat',image,library==='bundled-expat'?s.bundledLibrary.path:(debian?'/usr/lib/x86_64-linux-gnu/':'/usr/lib/')+library+'.so.1'],{encoding:null});
  if(library==='bundled-expat')assert.equal(sha(bytes),s.bundledLibrary[state==='before'?'beforeSha256':'afterSha256']);
  const file=dir+'/'+state+'-'+library+'.so';fs.writeFileSync(file,bytes);
  const symbols=run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>['GLOBAL','WEAK'].includes(f[4])&&f[6]!=='UND').map(f=>f[7]).sort();assert(symbols.length>60);
  const needed=run('readelf',['-d',file]).split('\n').filter(l=>/\((?:SONAME|NEEDED)\)/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();
  pair.push({imageId:image,library,sha256:sha(bytes),symbols,needed});
 }
 assert(pair[0].symbols.every(s=>pair[1].symbols.includes(s)),'Existing ABI export removed');assert.deepEqual(pair[1].needed,pair[0].needed);abi.push(...pair);}
 const wideRows=[];if(debian){assert.equal(sha(fs.readFileSync(new URL('./expat-wide.c',import.meta.url))),pins.wideSourceSha256);assert.equal(sha(fs.readFileSync(fixture+'/wide')),actualPins.wideBinarySha256);for(const imageId of [b.base,b.imageId]){assert.equal(run('docker',['run',...limits,'--network','none','-v',fixture+'/wide:/wide:ro','--entrypoint','/wide',imageId]).trim(),'EXPAT_WIDE_PASSED');wideRows.push({imageId,passed:true,checks:3});}}
 const config=JSON.parse(run('docker',['image','inspect','--format','{{json .Config}}',s.base]));
 const nginx=JSON.stringify([config.Entrypoint,config.Cmd]).includes('nginx'),configurations=[];
 if(nginx)for(const name of s.containers){
  assert.equal(run('docker',['inspect','--format','{{.Image}}',name]).trim(),s.base);
  const user=run('docker',['inspect','--format','{{.Config.User}}',name]).trim();assert(['101','101:101'].includes(user));
  run('docker',['run',...limits,'--network','container:'+name,'--volumes-from',name+':ro','--tmpfs','/tmp:rw,size=32m,mode=1777','--user',user,'--entrypoint','nginx',b.imageId,'-t']);
  configurations.push({container:name,nativeNginxConfiguration:'passed'});
 }
 fs.writeFileSync(dir+'/consumer.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,base:b.base,abiPreserved:true,neededPreserved:true,abi,wideRows,configurations,nativeRows:b.nativeRows,scope:nginx?'Native parser, preserved ABI/application bytes and actual read-only NGINX configuration. No user files processed.':'Native parser and preserved ABI/application bytes; package-only compatibility, not a new complete app workflow.'},null,2)+'\n');
 console.log(key+': native ABI and '+configurations.length+' NGINX configurations verified');
}
