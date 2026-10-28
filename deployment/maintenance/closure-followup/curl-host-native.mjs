// Test the actual installed host libraries against a network-isolated fixture.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
assert(process.argv.slice(2).every(a=>a==='--oct28'));const oct28=process.argv.includes('--oct28');
const dir=oct28?'/var/lib/utilibre-maintenance/security-20261028':'/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
const host=JSON.parse(fs.readFileSync(dir+'/curl-host.json'));assert.equal(host.status,'passed');
const name='maintenance-curl-host-fixture',rows=[];
run('docker',['run','-d','--name',name,'--network','none','--read-only','--cpus','0.5','--memory','128m','--pids-limit','32','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--mount','type=bind,src='+dir+'/curl-fixture,dst=/fixture,readonly','--mount','type=bind,src='+here+'curl-fixture-server.py,dst=/server.py,readonly','--entrypoint','python3',oct28?'sha256:4cd9da5932965ac14ee70f3bd11c80acee56147ab4b2b638552aeee756815a49':'utilibre-curl-native-builder:trixie-20261012','/server.py']);
try{
 run('docker',['exec',name,'python3','-c','import socket,time\nfor i in range(40):\n try:\n  socket.create_connection(("127.0.0.1",18443),.1).close();break\n except OSError:time.sleep(.1)\nelse:raise RuntimeError("fixture not ready")']);
 const pid=run('docker',['inspect','--format','{{.State.Pid}}',name]);assert(/^[1-9]\d+$/.test(pid));
 // Only the short-lived test process enters the fixture network namespace;
 // its filesystem remains the host's, so these are the actual installed ELFs.
 for(const library of ['/usr/lib/x86_64-linux-gnu/libcurl.so.4','/usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.4','/usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3']){
  const result=run('nsenter',['--net=/proc/'+pid+'/ns/net',dir+'/curl-fixture/curl-native',library,dir+'/curl-fixture/cert.pem']);assert.equal(result,'CURL_NATIVE_GET_REDIRECT_GZIP_POST_TLS_TRUST_REJECTION_404_PASSED');
  rows.push({library,sha256:createHash('sha256').update(fs.readFileSync(library)).digest('hex'),checks:7,passed:true});
 }
 fs.writeFileSync(dir+'/curl-host-live.json',JSON.stringify({date:new Date().toISOString(),passed:true,rows,network:'Separate network-none fixture namespace; no production network state changed',limitations:'Synthetic HTTP/TLS, not external/QUIC throughput or complete protocol coverage'},null,2)+'\n');
 console.log('Actual host curl: both TLS libraries and compatibility alias pass seven isolated transfer checks each.');
}finally{run('docker',['rm','-f','-v',name]);}
