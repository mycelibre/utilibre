import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url));
const jose=process.argv[2]==='--jose',oct28=process.argv[2]==='--oct28'||jose,netReview=process.argv[2]==='--net'||oct28;assert(!process.argv[2]||netReview,'Use --net, --oct28 or no argument');
const directory=jose?'/var/lib/utilibre-maintenance/security-20261028/jose-caddy':oct28?'/var/lib/utilibre-maintenance/security-20261028/caddy':'/var/lib/utilibre-maintenance/caddy-security-20261011'+(netReview?'/net':'');
const report=JSON.parse(readFileSync(directory+'/build.json'));
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Isolated Caddy candidate check failed; command output suppressed.');}}
const bounded=['--network','none','--read-only','--cpus','.5','--memory','192m','--memory-swap','192m','--pids-limit','96','--cap-drop','ALL','--security-opt','no-new-privileges:true','--log-driver','none'];
const inspect=ref=>JSON.parse(docker(['image','inspect',ref]))[0];
const run=(ref,cmd)=>docker(['run','--rm',...bounded,'--entrypoint','sh',ref,'-c',cmd]);
const rows=[];
for(const row of report.rows){
 assert.equal(inspect(row.base).Id,row.baseId);assert.equal(inspect(row.candidate).Id,row.candidateId);
 for(const key of ['User','Env','Cmd','Entrypoint','WorkingDir','ExposedPorts','Healthcheck'])assert.deepEqual(inspect(row.candidate).Config[key],inspect(row.base).Config[key],'Image configuration changed');
 const info=ref=>run(ref,row.path+' build-info');
 const original=info(row.base),candidate=info(row.candidate);
 assert(candidate.startsWith(oct28?'go\tgo1.26.10\n':'go\tgo1.26.9\n'));assert(original.startsWith(jose?'go\tgo1.26.10\n':oct28?'go\tgo1.26.9\n':'go\tgo1.26.8\n'));
 const deps=raw=>raw.split('\n').filter(line=>line.startsWith('dep\t')).map(line=>line.split('\t'));
 const versions=raw=>deps(raw).map(fields=>fields.slice(0,3).join('\t')).sort();
 const expected=versions(original).map(line=>jose?line.replace('github.com/go-jose/go-jose/v4\tv4.1.5','github.com/go-jose/go-jose/v4\tv4.1.6'):netReview?line.replace('golang.org/x/net\tv0.59.0','golang.org/x/net\tv0.60.0'):line);
 assert.deepEqual(versions(candidate),expected,'Unreviewed compiled module versions changed');
 if(netReview)assert(versions(candidate).includes('dep\tgolang.org/x/net\tv0.60.0'));
 // A -mod=vendor binary may omit sums from build-info. Verify every original
 // linked dependency checksum against the official artifact's untouched go.sum.
 const sums=readFileSync(directory+'/artifact/notices/go.sum','utf8').split('\n');
 for(const [,module,version,sum] of deps(original))if(sum)assert(sums.includes(module+' '+version+' '+sum),'Official dependency checksum differs');
 for(const [,module,version,sum] of deps(candidate))if(sum)assert(sums.includes(module+' '+version+' '+sum),'Compiled dependency checksum differs');
 assert.equal(run(row.candidate,row.path+' version').trim().split(' ')[0],run(row.base,row.path+' version').trim().split(' ')[0],'Caddy native release identity changed');
 assert.equal(run(row.candidate,row.path+' list-modules'),run(row.base,row.path+' list-modules'),'Native modules changed');
 const hashCommand=row.kind==='wishlist'?'find /usr/src/app -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum':'find /app -type f ! -path /app/node_modules/.bin/caddy -print0 | sort -z | xargs -0 sha256sum | sha256sum';
 assert.equal(run(row.candidate,hashCommand),run(row.base,hashCommand),'Application files changed');
 const osCommand=row.kind==='wishlist'?'dpkg-query -W | sort':'apk info -vv | sort';
 assert.equal(run(row.candidate,osCommand),run(row.base,osCommand),'OS packages changed');
 assert.equal(run(row.candidate,'stat -c %a '+row.path).trim(),'755');
 docker(['run','--rm',...bounded,'--tmpfs','/tmp:rw,size=32m,mode=1777','--mount','type=bind,src='+recipe+'native.cjs,dst=/native.cjs,readonly','-e','CADDY_BINARY='+row.path,'--entrypoint','node',row.candidate,'/native.cjs']);
 rows.push({...row,status:'passed',compiler:oct28?'go1.26.10':'go1.26.9',netReview,nativeProxy:true,gzip:true,sse:true,http2:true,configUnchanged:true,applicationUnchanged:true,dependencyChanges:netReview&&!oct28?['golang.org/x/net v0.59.0 to v0.60.0']:[],originalChecksumsMatchOfficialArtifact:true});
 console.log('Caddy parity/native gate passed: '+row.kind);
}
writeFileSync(directory+'/checks.json',JSON.stringify({date:new Date().toISOString(),status:'passed',deployed:false,rows,limitations:'Generic isolated native Caddy gate; separate disposable Wishlist and newsletter application checks required.'},null,2)+'\n',{mode:0o600});
