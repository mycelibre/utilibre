"""Select the same reviewed crypto source for the shell-free Yopass image."""
import hashlib,json,os,shutil,subprocess
from pathlib import Path
os.umask(0o077)
HERE=Path(__file__).resolve().parent;ROOT=Path('/var/lib/utilibre-maintenance/security-20261122');OUT=ROOT/'openssl-distroless-runtime'
p=HERE/'openssl-distroless-runtime-inputs.json';assert not p.exists() and not OUT.exists()
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
source=read(HERE/'openssl-runtime-inputs.json');assert sha(ROOT/'openssl-build-v2/built.json')==source['sourceBuildSha256']
assert shutil.disk_usage(ROOT).free>=source['minimumFreeBytes']
name='utilibre-community-yopass-1';image,ref=subprocess.check_output(['docker','inspect','--format','{{.Image}} {{.Config.Image}}',name],text=True,timeout=15).split()
assert image=='sha256:dd8648dfd46a0e826855ae1bbf7ab2427f58efcc2640b63f7aa6a4cceff71d34'
OUT.mkdir(mode=0o700)
for n in ('debian-acquisition','fixtures','before','vendor-debian','dpkg-image-inventory'):(OUT/n).mkdir(mode=0o700)
pin=source['packages']['libssl3t64'];assert sha(ROOT/'openssl-build-v2'/pin['file'])==pin['sha256'];os.link(ROOT/'openssl-build-v2'/pin['file'],OUT/'debian-acquisition'/pin['file'])
shutil.copyfile(ROOT/'openssl-runtime/fixtures/openssl',OUT/'fixtures/openssl');(OUT/'fixtures/openssl').chmod(0o755)
assert sha(OUT/'fixtures/openssl')==source['nativeFixture']['cliSha256']
shutil.copyfile(ROOT.parent/'security.json',OUT/'before/security.json');shutil.copyfile(ROOT/'scanner-inputs.json',OUT/'scanner-inputs.json');(OUT/'scan-cache').symlink_to(ROOT/'scan-cache')
v={k:source[k] for k in ('schemaVersion','minimumFreeBytes','database','exporterSha256','sourceBuildSha256','nativeFixture')}
v['packages']={'trixie/libssl3t64':pin};v['rows']=[{'key':'community-yopass','base':image,'oldRefs':[ref],'containers':[name],'kind':'debian','suite':'trixie','packages':{'libssl3t64':{'installed':'3.5.7-1~deb13u3','package':'trixie/libssl3t64'}},'candidate':'utilibre-openssl-yopass:20261122','approval':'preparation-only','releaseApproval':'not-approved'}]
v['runtimeLimit']='Retain distroless payload: no shell, package manager, init, loader cache or legacy provider. Default-provider/TLS and native Yopass workflows are tested; no legacy-provider support claimed.'
p.write_text(json.dumps(v,indent=2)+'\n');print('Exact Yopass crypto candidate selected; no runtime changes.')
