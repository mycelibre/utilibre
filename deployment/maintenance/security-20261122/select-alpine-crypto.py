"""Capture a finite library-only candidate set from existing inventories.

Read-only production inspection; no approval or package resolution. Exact APKs
are reused from the authenticated November 22 acquisition.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
old=json.loads((HERE/'vendor-inputs.json').read_text())
profiles=json.loads((HERE.parent/'security-20261109/musl-inputs.json').read_text())['rows']
names=['community-ntfy','public-utility-portal','chitchatter-tracker','collaboration-pilot-wbo',
 'additions-dumb','newsletters-smtp','biblioreads-biblioreads','bytestash-bytestash',
 'additions-fmd','pack-galene-galene','records-bookplate','records-db','opengist-opengist',
 'gathio-gathio','spliit-app','services-valkey','newsletters-web','projects-app','razzia-socket','simplelogin-db']
rows=[]
for key in names:
 name=('public-utility-portal-1' if key=='public-utility-portal' else 'utilibre-'+key+'-1')
 live=json.loads(subprocess.check_output(['docker','inspect',name],timeout=20))[0]
 base=live['Image'];inv=ROOT/'apk-inventory'/(base[7:]+'.json');d=json.loads(inv.read_text())
 assert d['image']==base and d['release'] in ('3.24.1','3.24.2')
 assert all(subprocess.check_output(['docker','inspect','--format','{{.Image}}',n],timeout=20).decode().strip()==base for n in d['containers'])
 pk={k:d['packages'][k]['V'] for k in ('libcrypto3','libssl3','openssl') if k in d['packages']}
 assert set(pk)>={'libcrypto3','libssl3'} and set(pk.values())<= {'3.5.8-r0','3.5.9-r0'}
 profile='node-runtime' if key=='public-utility-portal' else next(r['consumerProfile'] for r in profiles if name in r['containers'])
 rows.append({'key':key,'base':base,'containers':d['containers'],'oldRefs':d['references'],
  'release':d['release'],'kind':'alpine','packages':pk,'candidate':'utilibre-crypto-'+key+':20261122',
  'approval':'preparation-only','consumerProfile':profile,'inventorySha256':sha(inv),
  'compatibility':'Exact signed OpenSSL overlay only; unchanged app, musl, package hooks and configuration; native crypto/TLS and retained consumer checks required.'})
inputs={k:old[k] for k in ('schemaVersion','minimumFreeBytes','exporterSha256','database')}
inputs.update({'fixtures':{},'packages':{k:old['packages'][k] for k in ('openssl','libcrypto3','libssl3')},'rows':rows,
 'nativeFixture':{**json.loads((HERE/'openssl-runtime-inputs.json').read_text())['nativeFixture'],
  'cryptoScriptSha256':sha(HERE.parent/'openssl-bookworm-followup/native-crypto.sh'),
  'consumerSha256':sha(HERE.parent/'security-20261109/check-musl-runtimes.py')},
 'limitations':['No source/app upgrade; unchanged Node bundled crypto is not proof of OS OpenSSL behavior.',
  'Only vendor-fixed package findings are eligible for removal by the scanner; no automatic advisory exception.']})
for v in inputs['packages'].values():assert sha(ROOT/'vendor-packages'/v['file'])==v['sha256']
out=HERE/'alpine-crypto-inputs.json';assert not out.exists();out.write_text(json.dumps(inputs,indent=2)+'\n')
r=ROOT/'alpine-crypto';r.mkdir(exist_ok=True)
# Exact signed APK CLI for testing images without a CLI; never installed there.
import tarfile
f=r/'fixtures';f.mkdir(exist_ok=True)
with tarfile.open(ROOT/'vendor-packages'/inputs['packages']['openssl']['file']) as t:
 member=t.getmember('usr/bin/openssl');assert member.isfile();(f/'openssl').write_bytes(t.extractfile(member).read());(f/'openssl').chmod(0o755)
inputs['nativeFixture']['cliSha256']=sha(f/'openssl')
out.write_text(json.dumps(inputs,indent=2)+'\n')
print(json.dumps({'prepared':len(rows),'activated':False}))
