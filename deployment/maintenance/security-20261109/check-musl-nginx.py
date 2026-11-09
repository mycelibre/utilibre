"""Bounded libc/NGINX compatibility checks for the explicitly selected static images.

No production mounts, port publishing, live providers, browser data or telemetry.
Application bundles are byte-compared by alpine.mjs; this tests their server,
not a second full browser audit of unchanged JavaScript.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109')
SPECS = json.loads((HERE / 'musl-inputs.json').read_text())['rows']
KEYS = sys.argv[1:]
assert KEYS and len(KEYS) == len(set(KEYS))
LIMITS = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '1', '--memory', '192m', '--memory-swap', '192m',
          '--pids-limit', '64', '--log-driver', 'none']
CLIENT = 'sha256:0243688ca5bc6f67632f74b66e0a0e877aebb02cd00940605a12d3beee75aeca'

def run(args, timeout=45):
    try:
        return subprocess.check_output(args, stderr=subprocess.PIPE, timeout=timeout)
    except subprocess.CalledProcessError as e:
        print(e.stderr.decode(errors='replace'), file=sys.stderr)
        raise

CLIENT_JS = r"""
const assert=require('node:assert/strict'),http=require('node:http'),zlib=require('node:zlib');
const request=(path,headers={})=>new Promise((resolve,reject)=>{
 const req=http.get({host:'127.0.0.1',port:18080,path,headers},r=>{
  const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));
 });req.setTimeout(3000,()=>req.destroy(Error('timeout')));req.on('error',reject);
});
(async()=>{
 let root;for(let i=0;i<30;i++){try{root=await request('/');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.equal(root.status,200);assert(root.body.length>100);assert.match(root.body.toString(),/<html|<!doctype/i);
 const plain=await request('/sample.txt');assert.equal(plain.status,200);assert.equal(plain.body.toString(),'fictional ñ example\n'.repeat(512));
 const range=await request('/sample.txt',{Range:'bytes=0-8'});assert.equal(range.status,206);assert.deepEqual(range.body,plain.body.subarray(0,9));
 const zipped=await request('/sample.txt',{'Accept-Encoding':'gzip'});assert.equal(zipped.headers['content-encoding'],'gzip');assert.deepEqual(zlib.gunzipSync(zipped.body),plain.body);
 const cached=await request('/sample.txt',{'If-None-Match':plain.headers.etag});assert.equal(cached.status,304);assert.equal(cached.body.length,0);
 const regex=await request('/task/123');assert.equal(regex.status,200);assert.equal(regex.body.toString(),'task=123');
 assert.equal((await request('/task/not-numeric')).status,404);
 const redir=await request('/move');assert.equal(redir.status,302);assert.match(redir.headers.location,/\/sample.txt$/);
 assert.equal((await request('/missing.txt')).status,404);
 console.log(JSON.stringify({passed:true,checks:9,rootSha256:require('node:crypto').createHash('sha256').update(root.body).digest('hex')}));
})().catch(e=>{console.error(e);process.exit(1)});
"""

def symbols(path):
    lines=run(['readelf','--dyn-syms','--wide',str(path)]).decode().splitlines()
    return sorted({p[7] for line in lines if len(p:=line.split())>=8 and p[4] in ('GLOBAL','WEAK') and p[6]!='UND'})

for key in KEYS:
    s=next(row for row in SPECS if row['key']==key)
    assert s.get('consumerProfile') in ('static-nginx', 'nginx-runtime'), 'Not a reviewed NGINX input'
    out=ROOT/'musl'/key
    b=json.loads((out/'build.json').read_text())
    assert b['passed'] and b['configurationUnchanged'] and b['unrelatedPackagesUnchanged']
    assert not (out/'consumer.json').exists(), 'Preserve completed proof'
    rows=[]; abi=[]
    with tempfile.TemporaryDirectory(prefix='static-fixture-',dir=out) as temp:
        t=Path(temp);t.chmod(0o755)
        (t/'site').mkdir(); (t/'site/index.html').write_text('<!doctype html><html lang="en"><head><title>Fictional runtime check</title></head><body><h1>Fictional fixture</h1><p>No user data or outside services.</p></body></html>')
        (t/'sample.txt').write_text('fictional ñ example\n'*512)
        (t/'nginx.conf').write_text('''pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 32; }
http { access_log off; client_body_temp_path /tmp/body;
 proxy_temp_path /tmp/proxy; fastcgi_temp_path /tmp/fastcgi;
 uwsgi_temp_path /tmp/uwsgi; scgi_temp_path /tmp/scgi;
 gzip on; gzip_min_length 20; gzip_types text/plain;
 server { listen 18080; root /usr/share/nginx/html;
  location = /sample.txt { alias /fixture/sample.txt; }
  location ~ ^/task/([0-9]+)$ { return 200 "task=$1"; }
  location = /move { return 302 /sample.txt; }
 }
}
'''.replace('root /usr/share/nginx/html;', 'root /fixture/site;' if s['consumerProfile']=='nginx-runtime' else 'root /usr/share/nginx/html;'))
        for p in t.rglob('*'):p.chmod(0o755 if p.is_dir() else 0o644)
        for index,image in enumerate([b['base'],b['imageId']]):
            name=f'utilibre-musl-static-{os.getpid()}-{index}'
            try:
                run(['docker','create','--name',name,'--network','none',*LIMITS,
                     '--user','101:101','--tmpfs','/tmp:rw,size=8m,mode=1777',
                     '-v',str(t)+':/fixture:ro','--entrypoint','nginx',image,
                     '-c','/fixture/nginx.conf','-g','daemon off;'])
                lib=t/f'libc-{index}.so'
                run(['docker','cp',name+':/lib/ld-musl-x86_64.so.1',str(lib)])
                abi.append(symbols(lib))
                run(['docker','run','--rm',*LIMITS,'--network','none','--user','101:101',
                     '--tmpfs','/tmp:rw,size=8m,mode=1777','-v',str(t)+':/fixture:ro',
                     '--entrypoint','nginx',image,'-t','-c','/fixture/nginx.conf'])
                run(['docker','start',name])
                check=json.loads(run(['docker','run','--rm',*LIMITS,
                     '--network','container:'+name,'--entrypoint','node',CLIENT,'-e',CLIENT_JS]))
                assert check['passed'] and check['checks']==9
                rows.append({'imageId':image,**check})
            finally:
                subprocess.run(['docker','rm','-f','-v',name],capture_output=True,timeout=30)
    assert set(abi[0])<=set(abi[1]), 'Removed libc exports'
    assert rows[0]['rootSha256']==rows[1]['rootSha256']
    proof={'date':datetime.now(timezone.utc).isoformat(),'passed':True,
           'imageId':b['imageId'],'base':b['base'],'rows':rows,
           'abiPreserved':True,'baselineExportedSymbols':len(abi[0]),
           'nativeRows':b['nativeRows'],'fixtureSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'network':'none; local container loopback only',
           'profile':s['consumerProfile'],
           'scope':'Application/configuration bytes unchanged; actual static HTML or explicit fictional gateway root. NGINX content, range, compression, cache, regex route, redirect and missing-file behavior. No browser-tool internals changed or retested.'}
    (out/'consumer.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(key+': native libc ABI and NGINX compatibility passed',flush=True)
