import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
const dir='/var/lib/utilibre-maintenance/security-20261022/markmap',root='/home/ubuntu/freetools',b=JSON.parse(fs.readFileSync(dir+'/build.json')),name='maintenance-markmap-oct22',base='http://127.0.0.1:3440';
const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts});
assert.equal(run('docker',['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
try{
 // The test reaches the loopback-only published port through Docker's bridge,
 // not the real edge proxy. Permit that one test source in a disposable copy.
 const gateway=run('docker',['network','inspect','bridge','--format','{{(index .IPAM.Config 0).Gateway}}']).trim();assert(/^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/.test(gateway));
 const config=fs.readFileSync(root+'/deployment/toolbox/nginx-browser.conf','utf8');assert.equal(config.split('    deny all;').length,2);fs.writeFileSync(dir+'/nginx-test.conf',config.replace('    deny all;',`    allow ${gateway};\n    deny all;`),{mode:0o644});fs.chmodSync(dir+'/nginx-test.conf',0o644);
 run('docker',['run','-d','--name',name,'--read-only','--user','101:101','--cpus','0.5','--memory','128m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','-p','127.0.0.1:3440:8080','-v',dir+'/nginx-test.conf:/etc/nginx/nginx.conf:ro','-v',root+'/deployment/toolbox/security-markmap.conf:/etc/nginx/tool-security.conf:ro',b.imageId]);
 const raw=run('node',[root+'/deployment/toolbox/check-markmap.mjs'],{env:{...process.env,MARKMAP_TEST_URL:base}});fs.writeFileSync(dir+'/browser.json',raw,{mode:0o600});const r=JSON.parse(raw);assert.equal(r.result,'PASS');assert.deepEqual(r.externalRequests,[]);
 fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,checks:r.checks,externalRequests:0,desktopAndMobileEmulation:true,productionChanged:false},null,2),{mode:0o600});console.log('Markmap: EN/ES editing, export, malicious imports, local storage failures and local-only network checks passed.');
}catch(e){fs.writeFileSync(dir+'/native-error.log',String(e.stdout||'')+String(e.stderr||e.message),{mode:0o600});throw Error('Markmap candidate check failed; private evidence retained');}
finally{run('docker',['rm','-f',name]);}
