import pathlib,subprocess,json,os,shutil,sqlite3
os.umask(0o077);r=pathlib.Path('/var/lib/utilibre-maintenance/held-upgrades-20261111/kitchenowl');out=r/'migration-native';out.mkdir();data=out/'data';data.mkdir();os.chown(data,1000,1000)
old=json.load(open(r/'baseline.json'))['imageId'];new=json.load(open(r/'startup-final-image.json'))['imageId']
fixture=pathlib.Path('/home/ubuntu/freetools/deployment/maintenance/xml-final/kitchenowl.py').read_text().replace('password = secrets.token_urlsafe(24)',"password = 'Fictional-migration-password-only-2026'")
fixture=fixture.replace("    for row in [first,second]: api(f\"/household/{row['id']}\",'DELETE')", "    import json\n    from pathlib import Path\n    Path('/data/fixture.json').write_text(json.dumps({'first':first['id'],'second':second['id']}))")
(out/'seed.py').write_text(fixture);(out/'seed.py').chmod(0o644)
verify='''import json
from pathlib import Path
from app import app
app.config['TESTING']=True
client=app.test_client()
r=client.post('/api/auth',json={'username':'fictionala','password':'Fictional-migration-password-only-2026'})
assert r.status_code==200
h={'Authorization':'Bearer '+r.json['access_token']}
x=json.loads(Path('/data/fixture.json').read_text())
for k in ['first','second']:
 r=client.get('/api/household/'+str(x[k])+'/export',headers=h);assert r.status_code==200
 assert any(y['name']=='Fictional apple bowl' for y in r.json['recipes'])
 assert any(y['name']=='Fictional apples' for y in r.json['items'])
print('NATIVE_MIGRATION_RESTORE_PASS')
'''
(out/'verify.py').write_text(verify);(out/'verify.py').chmod(0o644)
def check(image,root,script,phase,migrate):
 args=['docker','run','--rm','--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--memory-swap','768m','--cpus','1.5','--pids-limit','128','--log-driver','none','--tmpfs','/tmp:rw,size=64m,mode=1777','-e','PYTHONPATH=/usr/src/kitchenowl','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','COLLECT_METRICS=false','-e','KITCHENOWL_MCP_ENABLED=false','-e','LITELLM_LOCAL_MODEL_COST_MAP=true','-e','LITELLM_TELEMETRY=false','-e','STORAGE_PATH=/data','-e','JWT_SECRET_KEY=synthetic-maintenance-only-key-more-than-32-bytes','-e','PYTHONDONTWRITEBYTECODE=1','-v',str(root)+':/data','-v',str(out/script)+':/fixture.py:ro','--entrypoint','sh',image,'-c',('flask db upgrade && ' if migrate else '')+'python /fixture.py']
 with (out/(phase+'.log')).open('w') as f:subprocess.run(args,stdout=f,stderr=subprocess.STDOUT,timeout=180,check=True)
def snapshot(src,dst):
 dst.mkdir();os.chown(dst,1000,1000)
 with sqlite3.connect('file:'+str(src/'database.db')+'?mode=ro',uri=True) as a,sqlite3.connect(dst/'database.db') as b:a.backup(b);assert b.execute('PRAGMA integrity_check').fetchone()==('ok',)
 shutil.copyfile(src/'fixture.json',dst/'fixture.json')
 for p in dst.iterdir():os.chown(p,1000,1000)
check(old,data,'seed.py','old',True);snapshot(data,out/'before');check(new,data,'verify.py','upgraded',True);snapshot(data,out/'after');check(new,out/'after','verify.py','restored',False);check(old,out/'before','verify.py','rollback',False)
(out/'result.json').write_text(json.dumps({'passed':True,'oldImage':old,'imageId':new,'nativeAlembicMigration':True,'oldAccountAndTwoHouseholdsPreserved':True,'nativeJsonExport':True,'newSnapshotRestore':True,'oldSnapshotRollback':True,'network':'none','productionChanged':False},indent=2)+'\n');print('KitchenOwl native upgrade, data retention, export and both restore paths passed')
