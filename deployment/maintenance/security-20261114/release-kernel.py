"""Explicit maintenance-window kernel installation; never reboots automatically.

Use only after the operator confirms console access and paused VM-management
jobs. The window argument is a current UTC timestamp, not a standing approval.
"""
import hashlib,json,os,pathlib,subprocess,sys
from datetime import datetime,timezone
os.umask(0o077)
r=pathlib.Path('/var/lib/utilibre-maintenance/security-20261114/kernel')
assert len(sys.argv)==3 and sys.argv[1]=='--confirmed-window'
confirmed=datetime.fromisoformat(sys.argv[2].replace('Z','+00:00'))
assert 0<=(datetime.now(timezone.utc)-confirmed).total_seconds()<900,'Maintenance confirmation expired'
def run(a,timeout=120):return subprocess.check_output(a,stderr=subprocess.PIPE,text=True,timeout=timeout).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=json.loads((r/'prepared.json').read_text());assert p['passed'] and p['abi']=='6.12.117+deb13-cloud-amd64'
assert run(['uname','-r'])==p['oldRunningKernel']
assert (pathlib.Path('/sys/firmware/efi')).is_dir(),'Boot mode changed'
assert not (r/'release.json').exists(),'Preserve completed/failed installation evidence'
assert run(['dpkg','--audit'])==''
paths=[]
for f in p['packages']:
 a=r/'archives'/f['file'];assert sha(a)==f['sha256'];paths.append(str(a))
sim=run(['apt-get','--simulate','--no-install-recommends','install',*paths]);(r/'install-simulation.log').write_text(sim+'\n')
assert sorted(l.split()[1] for l in sim.splitlines() if l.startswith('Inst '))==sorted(f['name'] for f in p['packages']);assert not any(l.startswith('Remv ') for l in sim.splitlines())
space=os.statvfs('/');assert space.f_bavail*space.f_frsize>=8*1024**3+70*1024**2,'Preserve scanner floor plus kernel/initramfs headroom'
before=run(['dpkg-query','-W','-f=${binary:Package}=${Version}\n']);(r/'before-packages.txt').write_text(before+'\n')
receipt={'date':datetime.now(timezone.utc).isoformat(),'status':'installing','windowConfirmedAt':confirmed.isoformat(),'preparedSha256':sha(r/'prepared.json'),'oldKernel':p['oldRunningKernel'],'newKernel':p['abi'],'rebooted':False,'rollback':'Keep prior kernel and initramfs; select 6.12.116 from GRUB via Proxmox console if boot fails. No automatic package removal.'}
def save():(r/'release.json').write_text(json.dumps(receipt,indent=2)+'\n')
save()
with (r/'install.log').open('wb') as log:
 result=subprocess.run(['apt-get','--no-download','--no-install-recommends','-y','install',*paths],stdout=log,stderr=log,timeout=600,env={**os.environ,'DEBIAN_FRONTEND':'noninteractive','NEEDRESTART_MODE':'l'})
if result.returncode:
 receipt['status']='failed';save();raise RuntimeError('Private installation log retained; do not reboot')
assert run(['dpkg','--audit'])==''
run(['grub-script-check','/boot/grub/grub.cfg']);grub=pathlib.Path('/boot/grub/grub.cfg').read_text();assert p['abi'] in grub and p['oldRunningKernel'] in grub
new=pathlib.Path('/boot/vmlinuz-'+p['abi']);assert sha(new)==p['candidateKernelSha256'];initrd=pathlib.Path('/boot/initrd.img-'+p['abi']);assert initrd.stat().st_size>1024**2
contents=run(['lsinitramfs',str(initrd)]);assert 'virtio' in contents and 'ext4' in contents
after=run(['dpkg-query','-W','-f=${binary:Package}=${Version}\n']);names={f['name'] for f in p['packages']};filtered=lambda data:[l for l in data.splitlines() if l.split('=',1)[0] not in names];assert filtered(before)==filtered(after),'Unexpected package change'
receipt.update(status='installed-awaiting-reboot',completedAt=datetime.now(timezone.utc).isoformat(),kernelSha256=sha(new),initramfsSha256=sha(initrd),oldKernelRetained=True);save()
print('Kernel installed, boot files checked, previous kernel retained. Reboot requires the confirmed window; then verify uname -r and service health.')
