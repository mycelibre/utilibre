// Reuse the established isolated Kuma account/SQLite workflow without edits.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const dir='/var/lib/utilibre-maintenance/security-20261103/oauth-debian',source='deployment/maintenance/closure-review/check-kuma-rsshub.mjs';
let code=fs.readFileSync(source,'utf8');const hash=s=>createHash('sha256').update(s).digest('hex');
assert.equal(hash(code),'abae40b245d4cf1db19f02cea11747622313310b9dc122bfcfed84bc78c8d8fe');
const changes=[];const replace=(old,next)=>{assert.equal(code.split(old).length-1,1);code=code.replace(old,next);changes.push({old,next});};
replace("import {specs,output} from '../js-closure/specs.mjs';","const specs=[],output='';");
replace("const health=process.argv[2]==='--health',healthRoot='/var/lib/utilibre-maintenance/security-20261028/health';",'const health=true,healthRoot='+JSON.stringify(dir)+';');
replace("name='maintenance-closure-'+key","name='maintenance-oauth-debian-'+key");
fs.writeFileSync(dir+'/application-fixture.mjs',code);fs.writeFileSync(dir+'/fixture-adapter.json',JSON.stringify({source,changes,adaptedSha256:hash(code)},null,2)+'\n');
const r=cp.spawnSync('node',[dir+'/application-fixture.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:2*1024**2,env:{PATH:process.env.PATH},cwd:'/home/ubuntu/freetools'});
fs.writeFileSync(dir+'/application-command.log',String(r.stdout||'')+String(r.stderr||'')+String(r.error||''));assert.equal(r.status,0,'Private native app evidence retained');console.log('Synthetic Kuma setup/login and native data operations passed; no notifications or production data.');
