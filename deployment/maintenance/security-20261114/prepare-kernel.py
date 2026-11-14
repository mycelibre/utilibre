"""Check signed native kernel packages in disposable storage; no installation."""
import hashlib,json,os,pathlib,subprocess,tempfile
from datetime import datetime,timezone
os.umask(0o077)
r=pathlib.Path('/var/lib/utilibre-maintenance/security-20261114/kernel');version='6.12.117-1';abi='6.12.117+deb13-cloud-amd64'
def run(a):return subprocess.check_output(a,stderr=subprocess.PIPE,text=True,timeout=90).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
packages=[]
for name in ['linux-image-'+abi,'linux-image-cloud-amd64']:
 archive=r/'archives'/(name+'_'+version+'_amd64.deb');control=run(['dpkg-deb','-f',str(archive),'Package','Version']);assert 'Package: '+name in control and 'Version: '+version in control
 record=run(['apt-cache','show',name+'='+version]);expected=next(l.split(': ',1)[1] for l in record.splitlines() if l.startswith('SHA256: '));assert sha(archive)==expected
 packages.append({'name':name,'version':version,'file':archive.name,'sha256':expected,'bytes':archive.stat().st_size,'origin':'Debian trixie-security signed APT index'})
with tempfile.TemporaryDirectory(prefix='utilibre-kernel-nov14-',dir='/dev/shm') as temp:
 tree=pathlib.Path(temp);subprocess.run(['dpkg-deb','-x',str(r/'archives'/packages[0]['file']),temp],check=True,timeout=90)
 kernel=tree/'boot'/('vmlinuz-'+abi);assert kernel.exists();kind=run(['file',str(kernel)]);assert 'Linux kernel x86 boot executable' in kind and abi in kind
 config=(tree/'boot'/('config-'+abi)).read_text();required=['CONFIG_EXT4_FS','CONFIG_VIRTIO_PCI','CONFIG_SCSI_VIRTIO','CONFIG_BLK_DEV_SD','CONFIG_EFI','CONFIG_EFI_STUB']
 for k in required:assert any(k+'='+v+'\n' in config for v in ('y','m')),k
 if not (tree/'lib').exists():
  assert (tree/'usr/lib/modules'/abi).is_dir();(tree/'lib').symlink_to('usr/lib')
 modules=tree/'lib/modules'/abi
 if not modules.exists():modules=tree/'usr/lib/modules'/abi
 assert modules.is_dir();assert (modules/'modules.builtin').exists()
 # Resolve the actual boot disk/network drivers against the candidate modules.
 result=subprocess.run(['depmod','-b',temp,'-a',abi],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=90)
 (r/'depmod.log').write_bytes(result.stdout+result.stderr);assert result.returncode==0,'Private depmod.log retained'
 drivers={}
 for name in ['virtio_pci','virtio_scsi','virtio_net','ext4','sd_mod']:
  drivers[name]=run(['modinfo','-b',temp,'-k',abi,'-F','filename',name]);assert drivers[name]
 evidence={'date':datetime.now(timezone.utc).isoformat(),'passed':True,'packages':packages,'abi':abi,'oldRunningKernel':run(['uname','-r']),'candidateKernelSha256':sha(kernel),'bootFormat':kind.replace(temp,'<isolated>'),'requiredConfig':required,'drivers':{k:v.replace(temp,'<isolated>') for k,v in drivers.items()},'grubConfigurationValid':True,'liveBootTested':False,'productionChanged':False,'limits':'Archive, architecture, boot-driver and current GRUB syntax checks; actual boot requires a maintenance window and post-reboot verification.'}
 run(['grub-script-check','/boot/grub/grub.cfg'])
 (r/'prepared.json').write_text(json.dumps(evidence,indent=2)+'\n')
print('Native 6.12.117 kernel packages, boot format, required drivers and current GRUB syntax verified; not installed')
