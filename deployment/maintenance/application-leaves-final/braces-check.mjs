import assert from 'node:assert/strict';import fs from 'node:fs';
import {root,here,run,docker,json,save,hash,floor} from './common.mjs';
const d=root+'/braces',image='sha256:ef67f76abe92ed0502d44d8e7dfe72ea56b2a1dde9286b0ad28358342a8c6cae';floor();
const opts=['--rm','--user','0','-e','HOME=/tmp','--cpus','2','--memory','1g','--memory-swap','1g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none'];
fs.mkdirSync(d+'/test-deps',{recursive:true});
if(!fs.existsSync(d+'/test-deps/node_modules/mocha/bin/mocha.js')){
 const t=docker(['run',...opts,'-v',d+'/test-deps:/devdeps','-v',d+'/test-package.json:/devdeps/package.json:ro','-w','/devdeps','--entrypoint','npm',image,'install','--ignore-scripts','--no-audit','--no-fund','--cache','/tmp/npm-test-cache']);fs.writeFileSync(d+'/test-dependencies.log',t);
}
const mounts=['-v',d+'/source:/candidate:ro','-v','/opt/utilibre/src/cryptpad/node_modules/braces:/original:ro','-v','/opt/utilibre/src/cryptpad:/consumer:ro','-v',d+'/source:/consumer/node_modules/braces:ro','-v','/opt/utilibre/src/cryptpad/node_modules:/node_modules:ro','-v',d+'/test-deps/node_modules:/devdeps/node_modules:ro'];
try{
 const out=docker(['run',...opts,'--network','none','--read-only','--tmpfs','/tmp:rw,size=32m,mode=1777',...mounts,'-v',here+'braces-native.cjs:/check.cjs:ro','--entrypoint','node',image,'/check.cjs']);const native=JSON.parse(out);assert(native.passed);save(d+'/native.json',{date:new Date().toISOString(),imageId:image,sourceProofSha256:hash(fs.readFileSync(d+'/source.json')),...native});
 const tests=docker(['run',...opts,'--network','none','--read-only','--tmpfs','/tmp:rw,size=32m,mode=1777',...mounts,'-e','NODE_PATH=/devdeps/node_modules:/node_modules','-w','/candidate','--entrypoint','node',image,'/devdeps/node_modules/mocha/bin/mocha.js','--reporter','json','test/*.js'],{timeout:180000});fs.writeFileSync(d+'/upstream-tests.json',tests);const report=JSON.parse(tests);assert.equal(report.stats.failures,0);save(d+'/checks.json',{date:new Date().toISOString(),passed:true,native,upstream:report.stats,sourceProofSha256:hash(fs.readFileSync(d+'/source.json'))});console.log(JSON.stringify({native,upstream:report.stats}));
}catch(e){fs.writeFileSync(d+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Braces gate failed; private error.log retained')}
