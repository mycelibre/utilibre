"""ABI and native runtime checks for unchanged application/library-only images.

All instances are disposable, network-none, bounded and have no production data
or credentials. This is not an application upgrade or a fresh end-to-end audit.
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
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/musl')
SPECS = json.loads((HERE / 'musl-inputs.json').read_text())['rows']
LIMITS = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '1', '--memory', '384m', '--memory-swap', '384m',
          '--pids-limit', '96', '--log-driver', 'none', '--network', 'none']
NODE = r"""
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),
crypto=require('node:crypto'),dns=require('node:dns').promises,http=require('node:http');
(async()=>{
 const b=Buffer.from('fictional español ñ example\n'.repeat(64));
 assert.deepEqual(zlib.gunzipSync(zlib.gzipSync(b)),b);
 assert.deepEqual(zlib.brotliDecompressSync(zlib.brotliCompressSync(b)),b);
 assert.throws(()=>zlib.gunzipSync(Buffer.from('invalid')));
 fs.writeFileSync('/tmp/native-data',b);assert.deepEqual(fs.readFileSync('/tmp/native-data'),b);fs.unlinkSync('/tmp/native-data');
 assert.equal(crypto.createHash('sha256').update('abc').digest('hex'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(crypto.randomBytes(32).length,32);assert.equal(crypto.scryptSync('fictional','fixture',32).length,32);
 assert.equal(new TextDecoder().decode(b),b.toString());assert.match('niño 123',/niño\s+\d+/u);
 assert((await dns.lookup('localhost')).address);
 const server=http.createServer((req,res)=>res.end(b));await new Promise(r=>server.listen(18081,'127.0.0.1',r));
 try{const r=await fetch('http://127.0.0.1:18081');assert.deepEqual(Buffer.from(await r.arrayBuffer()),b);}
 finally{await new Promise(r=>server.close(r));}
 console.log(JSON.stringify({passed:true,checks:11,runtime:process.version}));
})().catch(e=>{console.error(e);process.exit(1)});
"""
PHP = r"""
function check($v) { if (!$v) { throw new Exception('Native compatibility failed'); } }
$b=str_repeat("fictional español ñ example\n",64);
check(gzdecode(gzencode($b))===$b);check(json_decode(json_encode(['text'=>$b]),true)['text']===$b);
check(hash('sha256','abc')==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
check(strlen(random_bytes(32))===32);check(preg_match('/niño\s+\d+/u','niño 123')===1);
file_put_contents('/tmp/native-data',$b);check(file_get_contents('/tmp/native-data')===$b);unlink('/tmp/native-data');
check(gethostbyname('localhost')==='127.0.0.1');
$hash=password_hash('fictional-password',PASSWORD_BCRYPT,['cost'=>4]);check(password_verify('fictional-password',$hash));
echo json_encode(['passed'=>true,'checks'=>8,'runtime'=>PHP_VERSION]);
"""

def run(args, timeout=90):
    p = subprocess.run(args, capture_output=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError(p.stderr.decode(errors='replace')[:1500])
    return p.stdout

def symbols(path):
    lines = run(['readelf', '--dyn-syms', '--wide', str(path)]).decode().splitlines()
    return {p[7] for line in lines if len(p := line.split()) >= 8 and p[4] in ('GLOBAL', 'WEAK') and p[6] != 'UND'}

def database(image, profile):
    name = f'utilibre-libc-fixture-{os.getpid()}'
    try:
        if profile == 'redis-runtime':
            engine = 'valkey' if 'valkey' in run(['docker','run','--rm',*LIMITS,'--entrypoint','sh',image,'-c','command -v valkey-server || command -v redis-server']).decode() else 'redis'
            run(['docker','run','-d','--name',name,*LIMITS,'--user','65534:65534',
                 '--tmpfs','/tmp:rw,size=16m,mode=1777','--entrypoint',engine+'-server',image,
                 '--dir','/tmp','--save','','--appendonly','no','--maxmemory','16mb','--maxmemory-policy','noeviction'])
            cli = ['docker','exec',name,engine+'-cli']
            import time
            for _ in range(30):
                try:
                    if run(cli+['PING']).strip()==b'PONG':break
                except RuntimeError: pass
                time.sleep(.1)
            else: raise RuntimeError('Redis readiness')
            assert run(cli+['SET','fictional','example','EX','30']).strip()==b'OK'
            assert run(cli+['GET','fictional']).strip()==b'example'
            assert 0<int(run(cli+['TTL','fictional']))<=30
            assert run(cli+['EVAL',"return redis.call('GET',KEYS[1])",'1','fictional']).strip()==b'example'
            assert run(cli+['DEL','fictional']).strip()==b'1'
            return {'passed':True,'checks':6,'runtime':engine}
        assert profile=='postgres-runtime'
        # Existing postgres UID; initdb and all database files stay in tmpfs.
        command = '''set -eu
initdb -D /tmp/db -A trust --no-instructions >/dev/null
pg_ctl -D /tmp/db -l /tmp/pg.log -o "-k /tmp -h ''" -w start >/dev/null
trap 'pg_ctl -D /tmp/db -m fast -w stop >/dev/null' EXIT
psql -h /tmp -v ON_ERROR_STOP=1 -At postgres <<'SQL'
CREATE TABLE example (id int PRIMARY KEY, label text, payload jsonb);
INSERT INTO example VALUES (1, 'fictional niño', '{"count":3}');
SELECT label FROM example WHERE label ~ 'niño$';
SELECT payload->>'count' FROM example;
BEGIN; DELETE FROM example; ROLLBACK;
SELECT count(*) FROM example;
SQL
pg_dump -h /tmp --no-owner postgres >/tmp/export.sql
createdb -h /tmp restored
psql -h /tmp -v ON_ERROR_STOP=1 restored </tmp/export.sql >/dev/null
psql -h /tmp -At restored -c 'SELECT count(*) FROM example'
'''
        output=run(['docker','run','--rm',*LIMITS,'--user','postgres',
                    '--tmpfs','/tmp:rw,size=192m,mode=1777','--entrypoint','sh',image,'-ec',command]).decode()
        assert 'fictional niño\n3\n' in output and output.rstrip().endswith('1\n1'), output
        return {'passed':True,'checks':6,'runtime':'postgres','nativeDumpRestore':True}
    finally:
        subprocess.run(['docker','rm','-f','-v',name],capture_output=True,timeout=30)

assert sys.argv[1:] and len(set(sys.argv[1:]))==len(sys.argv[1:])
for key in sys.argv[1:]:
    s=next(r for r in SPECS if r['key']==key)
    profile=s['consumerProfile']
    assert profile in ('node-runtime','php-runtime','redis-runtime','postgres-runtime')
    out=ROOT/key;b=json.loads((out/'build.json').read_text())
    assert b['passed'] and b['configurationUnchanged'] and b['unrelatedPackagesUnchanged']
    assert not (out/'consumer.json').exists(), 'Preserve completed evidence'
    rows=[];abi=[]
    with tempfile.TemporaryDirectory(dir=out,prefix='abi-') as tmp:
        for index,image in enumerate([b['base'],b['imageId']]):
            lib=Path(tmp)/f'libc-{index}.so'
            lib.write_bytes(run(['docker','run','--rm',*LIMITS,'--entrypoint','cat',image,'/lib/ld-musl-x86_64.so.1']))
            abi.append(symbols(lib))
            if profile in ('redis-runtime','postgres-runtime'):
                result=database(image,profile)
            else:
                if profile=='node-runtime':command=['node','-e',NODE]
                else:
                    binary=run(['docker','run','--rm',*LIMITS,'--entrypoint','sh',image,'-ec',
                                'command -v php || command -v php85 || command -v php84 || command -v php83']).decode().strip()
                    assert binary.startswith('/') and '\n' not in binary
                    command=[binary,'-r',PHP]
                result=json.loads(run(['docker','run','--rm',*LIMITS,'--user','65534:65534',
                     '--tmpfs','/tmp:rw,size=32m,mode=1777','--entrypoint',command[0],image,*command[1:]]))
                assert result['passed'] and result['checks']==(11 if profile=='node-runtime' else 8)
            rows.append({'imageId':image,**result})
    assert abi[0]<=abi[1] and len(abi[0])>1000
    assert {k:v for k,v in rows[0].items() if k!='imageId'}=={k:v for k,v in rows[1].items() if k!='imageId'}
    proof={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'profile':profile,
           'imageId':b['imageId'],'base':b['base'],'rows':rows,'abiPreserved':True,
           'baselineExportedSymbols':len(abi[0]),'nativeRows':b['nativeRows'],
           'fixtureSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'network':'none; synthetic loopback only; no production mounts or secrets',
           'scope':'Library-only compatibility: native runtime/DB operations and unchanged application/configuration bytes. Not a fresh end-to-end application upgrade test.'}
    (out/'consumer.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(key+': '+profile+' compatibility passed',flush=True)
