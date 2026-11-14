"""Record the verified libpq-only runtime for the existing PrivateBin updater.

No activation, restart, source change, or network access. The updater's separate
--reconcile-runtime mode verifies the evidence and atomically updates receipts.
"""
import hashlib, json, subprocess
from pathlib import Path
H=Path(__file__).resolve().parent
ROOT=H.parents[2]
R=Path('/var/lib/utilibre-maintenance/security-20261114')
read=lambda p: json.loads(p.read_text())
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
p=ROOT/'deployment/utilibre/privatebin-updater/policy.json'
b=read(R/'services-privatebin/build.json')
d=read(R/'services-privatebin/release-utilibre-services.json')
assert b['passed'] and b['applicationBytesUnchanged'] and b['configurationUnchanged']
assert d['status']=='passed' and d['group']['rows'][0]['newImage']==b['imageId']
proof=next(x for x in read(R/'retained/index.json')['rows'] if x['imageId']==b['imageId'])
assert proof['passed'] and proof['allUnrelatedFilesUnchanged'] and proof['configurationUnchanged']
assert proof['packagesChanged']==['libpq']
policy=read(p)
old=policy['reviewedRuntimeTransition']
assert policy['runtimeImage'] in (b['base'],b['imageId'])
name='utilibre-services-privatebin-1'
assert subprocess.check_output(['docker','inspect','--format','{{.Image}}',name],text=True).strip()==b['imageId']
paths=list(old['payloadHashes'])
lines=subprocess.check_output(['docker','exec',name,'sha256sum',*paths],text=True).splitlines()
payload={s.split(None,1)[1]:s.split(None,1)[0] for s in lines}
assert payload==old['payloadHashes'], 'PrivateBin application payload changed'
source=json.loads(subprocess.check_output(['docker','exec',name,'cat',paths[0]],text=True))
for k in ('version','revision','archiveSha256'):assert source[k]==old[k]
proofpath=R/'retained'/(b['base'][7:19]+'-'+b['imageId'][7:19]+'.json')
evidence={
 'native':R/'services-privatebin/application.json',
 'deployment':R/'services-privatebin/release-utilibre-services.json',
 'runtimeBuild':R/'services-privatebin/build.json',
 'runtimeConsumer':R/'services-privatebin/consumer.json',
 'runtimeScan':R/'services-privatebin/scan-gate.json',
 'sourceReplay':proofpath,
}
for kind,f in evidence.items():
 assert read(f).get('status')=='passed' if kind=='deployment' else read(f)['passed']
scanner=Path('/opt/utilibre/maintenance/bin/trivy')
assert sha(scanner)==read(evidence['runtimeScan'])['scannerSha256']
assert subprocess.check_output([str(scanner),'--version'],text=True).strip()=='Version: 0.76.2'
policy.update(runtimeImage=b['imageId'],scannerVersion='0.76.2',scannerSha256=sha(scanner))
policy['reviewedRuntimeTransition']={**old,'previousImage':b['base'],'image':b['imageId'],
 'deployedAt':d['completedAt'],'purpose':'Reconcile the deployed libpq 18.7-r0 repair; identical PrivateBin 2.1.1 application, privacy settings, upload guard and template. No activation.',
 'evidence':{k:{'path':str(f.relative_to(R.parent)),'sha256':sha(f)} for k,f in evidence.items()}}
p.write_text(json.dumps(policy,indent=2)+'\n')
print('Reviewed PrivateBin runtime policy reconciled; application and service unchanged.')
