// Actual NGINX -> PHP-FPM with the existing read-only configuration, synthetic input only.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const repo='/home/ubuntu/freetools',root='/var/lib/utilibre-maintenance/security-20261028',dir=root+'/nginx-debian/rssbridge';
const b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/application.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/native-error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('NGINX native gate failed; private diagnostics retained');}};
const docker=(...a)=>run('docker',a),rows=[];
const configs=['rssbridge.ini.php','rssbridge-nginx.conf','rssbridge-fpm.conf'];
const configSha256=Object.fromEntries(configs.map(n=>[n,sha(fs.readFileSync(repo+'/deployment/community/'+n))]));
const destinations=['/app/config.ini.php','/etc/nginx/utilibre.conf','/etc/php/8.2/fpm/utilibre.conf'];
const mounts=configs.flatMap((n,i)=>['--mount','type=bind,src='+repo+'/deployment/community/'+n+',dst='+destinations[i]+',readonly']);
const limits=['--network','none','--read-only','--user','33:33','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','1','--pids-limit','64','--log-driver','none',
 '--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=32m,mode=1777','--tmpfs','/run:rw,nosuid,nodev,noexec,size=16m,mode=1777','--tmpfs','/app/cache:rw,nosuid,nodev,noexec,size=32m,uid=33,gid=33'];
for(const [i,imageId]of [b.base,b.imageId].entries()){
 const name='maintenance-nginx-rssbridge-'+i;let created=false;
 try{
  docker('run','-d','--name',name,...limits,...mounts,'--entrypoint','sh',imageId,'-ec','mkdir -p /run/php; nginx -t -c /etc/nginx/utilibre.conf; nginx -c /etc/nginx/utilibre.conf; exec php-fpm8.2 --fpm-config /etc/php/8.2/fpm/utilibre.conf --nodaemonize');created=true;
  for(let n=0;n<40;n++){try{docker('exec',name,'php','-r',"$f=@fsockopen('127.0.0.1',8080);exit($f?0:1);");break;}catch{if(n===39)throw Error('No native listener');await new Promise(r=>setTimeout(r,250));}}
  const code=`$check=0;function req($path,$method='GET'){$ctx=stream_context_create(['http'=>['method'=>$method,'ignore_errors'=>true,'follow_location'=>0,'timeout'=>5]]);$body=file_get_contents('http://127.0.0.1:8080'.$path,false,$ctx);return [$body,$http_response_header];}
function ok($condition){global $check;if(!$condition)throw new Exception('Native HTTP assertion failed at check '.($check+1));$check++;}
[$body,$h]=req('/');ok(str_contains($h[0],'200'));ok(str_contains($body,'RSS-Bridge'));ok(in_array('Referrer-Policy: no-referrer',$h));ok(in_array('X-Frame-Options: DENY',$h));ok(in_array('X-Content-Type-Options: nosniff',$h));
[$body,$h]=req('/index.php','HEAD');ok(str_contains($h[0],'200'));ok($body==='');
[$body,$h]=req('/','POST');ok(str_contains($h[0],'405'));
foreach(['/config.ini.php','/missing-fixture'] as $p){[$body,$h]=req($p);ok(str_contains($h[0],'404'));}
[$body,$h]=req('/../etc/passwd');ok(str_contains($h[0],'400'));
[$body,$h]=req('/.well-known/security.txt');ok(str_contains($h[0],'302'));ok(in_array('Location: https://utilibre.org/.well-known/security.txt',$h));
$limited=false;for($i=0;$i<14;$i++){[$body,$h]=req('/');if(str_contains($h[0],'429')){$limited=true;break;}}ok($limited);
echo json_encode(['passed'=>true,'checks'=>$check,'nativeNginxPhp'=>true,'privatePathsDenied'=>true,'boundedRateLimit'=>true]);`;
  const native=JSON.parse(run('docker',['exec','-i',name,'php'],{input:'<?php '+code}));assert(native.passed&&native.checks===14);rows.push({imageId,...native});
 }finally{if(created)docker('rm','-f',name);}
}
// Reuse the existing PHP HTTP/2 and fictional GitHub-to-Atom consumer checks.
const original=repo+'/deployment/maintenance/security-20261028/check-rssbridge.mjs';let code=fs.readFileSync(original,'utf8');
const changes=[["out=root+'/brotli/rssbridge'","out=root+'/nginx-debian/rssbridge'"],["here=new URL('../bookworm-curl-followup/',import.meta.url).pathname",'here='+JSON.stringify(repo+'/deployment/maintenance/bookworm-curl-followup/')],["name='maintenance-brotli-rssbridge-fixture'","name='maintenance-nginx-rssbridge-fixture'"]];
for(const [from,to]of changes){assert.equal(code.split(from).length,2);code=code.replace(from,to);}
const fixture=dir+'/consumer-adapter.mjs';fs.writeFileSync(fixture,code);run(process.execPath,[fixture]);
const consumer=JSON.parse(fs.readFileSync(dir+'/consumer.json'));assert(consumer.passed&&consumer.imageId===b.imageId&&consumer.rows.length===2&&consumer.rows.every(r=>r.fictionalFeed&&r.http2Negotiated&&r.chrome131Preserved));
fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,configSha256,consumerFixtureSha256:sha(fs.readFileSync(original)),adaptedFixtureSha256:sha(code),consumerUnchanged:true,network:'none; disposable loopback fixtures',limitation:'Compatibility and preservation checks, not reproduction of upstream memory-corruption exploits or live source availability.'},null,2)+'\n');
console.log('RSS-Bridge: old/new native NGINX, PHP, privacy, rejection, rate limit, HTTP/2 and fictional feed checks passed.');
