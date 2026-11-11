import pathlib,subprocess,json,os,sqlite3
os.umask(0o077);r=pathlib.Path('/var/lib/utilibre-maintenance/held-upgrades-20261111/candlr');out=r/'migration';out.mkdir();data=out/'data';data.mkdir();os.chown(data,1000,1000)
old=json.loads((r/'baseline.json').read_text())['oldImage'];new=json.loads((r/'build.json').read_text())['imageId']
seed=pathlib.Path('/home/ubuntu/freetools/deployment/maintenance/patch-leaves-final/candlr-native.cjs').read_text();start=seed.index(' const del=');end=seed.index('})().catch',start);seed=seed[:start]+" console.log('CANDLR_SEED_PASSED');\n"+seed[end:];(out/'seed.cjs').write_text(seed)
verify="""const assert=require('node:assert/strict');(async()=>{const base='http://127.0.0.1:8000';const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'fictional_a',password:'Fictional-password-for-native-gate-2026'})});assert(r.ok);const cookie=r.headers.get('set-cookie').split(';')[0];const e=await fetch(base+'/data/export?format=json',{headers:{Cookie:cookie}});assert(e.ok);assert((await e.text()).includes('Fictional Sol Example'));console.log('CANDLR_MIGRATION_RESTORE_PASSED');})().catch(e=>{console.error(e.message);process.exit(1)});""";(out/'verify.cjs').write_text(verify)
for p in out.glob('*.cjs'):p.chmod(0o644)
def check(image,store,script,phase):
 name='maintenance-candlr-migration';env=['-e','SECRET_KEY=Fictional-only-migration-key-longer-than-thirty-two','-e','ENABLE_REGISTRATIONS=true','-e','OIDC_ENABLED=false','-e','OIDC_DISABLE_PASSWORD_LOGIN=false','-e','CARDDAV_SYNC_INTERVAL_MINUTES=0','-e','UTILIBRE_DISABLE_UPDATE_CHECK=true']
 cmd=['docker','run','--rm','--name',name,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,size=32m,mode=1777','-v',str(store)+':/app/backend/data','-v',str(out/script)+':/fixture.cjs:ro',*env,'--entrypoint','sh',image,'-c',"cd /app/backend && alembic upgrade head && uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log >/tmp/server.log 2>&1 & pid=$!; trap 'kill $pid 2>/dev/null || true' EXIT; for n in $(seq 1 40); do node -e \"fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\" && break; sleep .5; done; node /fixture.cjs"]
 with (out/(phase+'.log')).open('w') as f:
  try:subprocess.run(cmd,stdout=f,stderr=f,timeout=120,check=True)
  finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def snapshot(src,dst):
 dst.mkdir();os.chown(dst,1000,1000);dbs=list(src.glob('*.db'));assert len(dbs)==1
 with sqlite3.connect('file:'+str(dbs[0])+'?mode=ro',uri=True) as a,sqlite3.connect(dst/dbs[0].name) as b:a.backup(b);assert b.execute('PRAGMA integrity_check').fetchone()==('ok',)
 for p in dst.iterdir():os.chown(p,1000,1000)
check(old,data,'seed.cjs','old');snapshot(data,out/'before');check(new,data,'verify.cjs','upgraded');snapshot(data,out/'after');check(new,out/'after','verify.cjs','restored');check(old,out/'before','verify.cjs','rollback')
(out/'result.json').write_text(json.dumps({'passed':True,'oldImage':old,'imageId':new,'nativeAlembicMigration':True,'existingAccountAndRecordPreserved':True,'nativeExport':True,'newSnapshotRestore':True,'oldSnapshotRollback':True,'network':'none','productionChanged':False},indent=2)+'\n');print('Candlr native migration and both restore paths passed')
