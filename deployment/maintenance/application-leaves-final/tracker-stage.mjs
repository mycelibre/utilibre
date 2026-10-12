import assert from 'node:assert/strict';
import fs from 'node:fs';
import {root,here,run,docker,json,node,overlay,save} from './common.mjs';
const d=root+'/tracker',context=d+'/context';fs.mkdirSync(context,{recursive:true});
const spec={key:'tracker',container:'utilibre-chitchatter-tracker-1',base:'sha256:7da7195308dd8b7fcfeb3fd85dcebbbc4661457f7737d5d76b0435f123d021bd',baseRef:'utilibre-cache-chitchatter-tracker:4.3.0-20261012',candidate:'utilibre-chitchatter-tracker:ip-security-20261012',roots:['/app','/usr/local']};
const old=JSON.parse(node(spec.base,`console.log(require('fs').readFileSync('/app/node_modules/bittorrent-tracker/package.json','utf8'))`));assert.equal(old.version,'11.2.3');
const src=d+'/source/package';fs.copyFileSync(src+'/lib/server/parse-udp.js',context+'/parse-udp.js');fs.copyFileSync(src+'/package.json',context+'/tracker-package.json');
for(const file of ['package.json','package-lock.json'])fs.copyFileSync('deployment/chitchatter/'+file,context+'/'+file);
const nested=JSON.parse(node(spec.base,`console.log(require('fs').readFileSync('/app/node_modules/.package-lock.json','utf8'))`));
assert.equal(nested.packages['node_modules/ip'].version,'2.0.1');delete nested.packages['node_modules/ip'];nested.packages['node_modules/bittorrent-tracker']=json(context+'/package-lock.json').packages['node_modules/bittorrent-tracker'];save(context+'/installed-lock.json',nested);
for(const p of fs.readdirSync(context))if(fs.statSync(context+'/'+p).isFile())fs.chmodSync(context+'/'+p,0o644);
const allowed=p=>p.startsWith('/app/node_modules/ip/')||['/app/package.json','/app/package-lock.json','/app/node_modules/.package-lock.json','/app/node_modules/bittorrent-tracker/package.json','/app/node_modules/bittorrent-tracker/lib/server/parse-udp.js'].includes(p);
const proof=await overlay(spec,context,'RUN rm -r /app/node_modules/ip\nCOPY parse-udp.js /app/node_modules/bittorrent-tracker/lib/server/parse-udp.js\nCOPY tracker-package.json /app/node_modules/bittorrent-tracker/package.json\nCOPY package.json package-lock.json /app/\nCOPY installed-lock.json /app/node_modules/.package-lock.json\n',allowed);
const args=['run','--rm','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','-v',here+'tracker-native.mjs:/test.mjs:ro','--entrypoint','node',proof.imageId,'/test.mjs'];
try{const result=JSON.parse(docker(args));assert(result.passed);save(d+'/native.json',{date:new Date().toISOString(),imageId:proof.imageId,...result});console.log(JSON.stringify({imageId:proof.imageId,...result}));}catch(e){fs.writeFileSync(d+'/native-error.log',String(e.stdout||'')+String(e.stderr||e));throw e}
