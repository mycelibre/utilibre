import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const dir='/var/lib/utilibre-maintenance/security-20261022/texlyre',repo='/home/ubuntu/freetools',name='maintenance-texlyre-oct22',b=JSON.parse(fs.readFileSync(dir+'/build.json'));
process.umask(0o077);assert(b.passed&&b.fullBuildAndSanitizerTests&&b.compilerAssetsVerified);assert.equal(createHash('sha256').update(fs.readFileSync(dir+'/dist.tar.gz')).digest('hex'),b.archiveSha256);
const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts});
assert.equal(run('docker',['ps','-aq','--filter','name=^/'+name+'$']).trim(),'');
const stage=fs.mkdtempSync(dir+'/candidate-');fs.chmodSync(stage,0o755);run('tar',['-xf',dir+'/dist.tar.gz','-C',stage]);
const gateway=run('docker',['network','inspect','bridge','--format','{{(index .IPAM.Config 0).Gateway}}']).trim();assert(/^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/.test(gateway));
let config=fs.readFileSync(repo+'/deployment/texlyre/nginx-server.conf','utf8');assert.equal(config.split('  deny all;').length,2);config=config.replace('  deny all;',`  allow ${gateway};\n  deny all;`).replace('  location / {','  location /test-only-pdfjs/ { alias /test-pdfjs/; }\n  location / {');
fs.writeFileSync(dir+'/nginx-test.conf',`worker_processes 1; pid /tmp/nginx.pid; error_log /dev/null crit; events { worker_connections 64; } http { include /etc/nginx/mime.types; types { application/javascript mjs; } default_type application/octet-stream; client_body_temp_path /tmp/body; proxy_temp_path /tmp/proxy; fastcgi_temp_path /tmp/fastcgi; uwsgi_temp_path /tmp/uwsgi; scgi_temp_path /tmp/scgi; ${config} }`,{mode:0o644});fs.chmodSync(dir+'/nginx-test.conf',0o644);
let started=false;
try{
 started=true;run('docker',['run','-d','--name',name,'--read-only','--user','101:101','--cpus','0.5','--memory','128m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','-p','127.0.0.1:3441:8087','-v',dir+'/nginx-test.conf:/etc/nginx/nginx.conf:ro','-v',stage+':/srv/utilibre-source/apps/texlyre:ro','-v',dir+'/pdfjs-dist:/test-pdfjs:ro','--entrypoint','nginx','sha256:fff793400ff20e1d06cad38928aef0158a7450301dab51290517a21177c525f7','-g','daemon off;']);
 const log=run('node',[repo+'/deployment/texlyre/check.mjs','--oct22'],{timeout:6*60*1000});fs.writeFileSync(dir+'/native.log',log);
 const result=JSON.parse(fs.readFileSync(dir+'/inspection.json'));assert(result.passed&&result.outside.length===0&&result.errors.length===0);
 fs.writeFileSync(dir+'/native.json',JSON.stringify({...result,archiveSha256:b.archiveSha256,stage},null,2));console.log('TeXlyre: PDF compilation, accents, ZIP export/import, local account and local-only request checks passed.');
}catch(e){fs.writeFileSync(dir+'/native-error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('TeXlyre gate failed; private evidence retained');}
finally{if(started)run('docker',['rm','-f',name]);}
