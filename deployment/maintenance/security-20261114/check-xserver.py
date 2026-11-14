"""Reuse isolated native X11 and complete Penpot export fixtures."""
import os,json,subprocess,hashlib
from pathlib import Path
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114/xserver');old=h.parent/'xvfb-single-screen-final';node='/root/.nvm/versions/node/v24.22.3/bin/node'
def execute(source,name,timeout=240):
 p=r/name;p.write_text(source)
 with (r/(name+'.log')).open('wb') as f:result=subprocess.run([node,'--input-type=module','-'],input=source.encode(),cwd='/home/ubuntu/freetools',stdout=f,stderr=f,timeout=timeout,env={**os.environ,'PATH':str(Path(node).parent)+':'+os.environ['PATH']})
 assert result.returncode==0,'Private '+name+' diagnostic retained'
s=(old/'check-host.mjs').read_text().replace('xvfb-single-screen-final-20261012','security-20261114/xserver').replace("new URL('./screen-native.mjs',import.meta.url).pathname",repr(str(old/'screen-native.mjs'))).replace("new URL('../xserver-followup/native.mjs',import.meta.url).pathname",repr(str(h.parent/'xserver-followup/native.mjs'))).replace("suite==='native'?'candidate':label","'candidate'").replace('oldTwoScreenAccepted:true','oldTwoScreenRefused:true');execute(s,'check-host.mjs')
s=(old/'check-dhi.mjs').read_text().replace("from'./stage.mjs'","from'"+(r/'stage.mjs').as_uri()+"'").replace("new URL('./screen-native.mjs',import.meta.url).pathname",repr(str(old/'screen-native.mjs'))).replace("new URL('../xserver-followup/native.mjs',import.meta.url).pathname",repr(str(h.parent/'xserver-followup/native.mjs'))).replace("(suite==='native'?'candidate':label)","'candidate'").replace('oldTwoScreenAccepted:true','oldTwoScreenRefused:true');execute(s,'check-dhi.mjs')
s=(old/'check-application.mjs').read_text().replace('xvfb-single-screen-final-20261012','security-20261114/xserver').replace('penpot-single-screen.json','penpot-xserver-nov14.json').replace("new URL('../check-penpot-2.18.3.mjs',import.meta.url)",repr(str(h.parent/'check-penpot-2.18.3.mjs')))
# Validate the exported PDF in the bounded native compiler instead of a retired fixture.
s=s.replace("['exec','maintenance-xvfb-single-screen-20261012','sh','-ec','qpdf --check /output/penpot-rectangle.pdf && qpdf --show-npages /output/penpot-rectangle.pdf']", "['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--cpus','.5','--log-driver','none','-v',root+'/output:/output:ro','--entrypoint','sh','"+json.load(open(r.parent/'native-builder/build.json'))['imageId']+"','-ec','qpdf --check /output/penpot-rectangle.pdf && qpdf --show-npages /output/penpot-rectangle.pdf']")
# Replacement above uses original constant; root path substitution leaves its name intact.
assert 'maintenance-security-' not in s
execute(s,'check-application.mjs',480)
print('Host and exporter native X11, account, collaboration and PNG/PDF export checks passed')
