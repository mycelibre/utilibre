"""Exact offline Guava replacement, including Closure's shaded copy. No release."""
import datetime, hashlib, json, os, pathlib, shutil, subprocess, tarfile, tempfile, zipfile

os.umask(0o077)
HERE = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path('/var/lib/utilibre-maintenance/security-20261103/guava')
SPEC = json.loads((HERE/'guava-inputs.json').read_text())
ROW = SPEC['rows'][0]
OUT = ROOT/'penpot'
OUT.mkdir(mode=0o700, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
def run(args, name, timeout=120):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout,
                            env={**os.environ, 'DOCKER_BUILDKIT':'0'})
    (OUT/(name+'.log')).write_bytes(result.stdout+result.stderr)
    assert result.returncode == 0, name+' failed; private evidence retained'
    return result.stdout.decode().strip()
def inspect(image):
    return json.loads(run(['docker','image','inspect',image],'image-inspect'))[0]
def java(args, mounts=(), memory='256m', timeout=120):
    return run(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL',
        '--security-opt','no-new-privileges','--cpus','1','--memory',memory,'--memory-swap',memory,
        '--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=32m',
        *[part for source,dest in mounts for part in ['-v',str(source)+':'+dest]],
        '--entrypoint',args[0],SPEC['compiler'],*args[1:]], 'java-'+str(java.counter), timeout)
java.counter = 0
def invoke(args, mounts=(), memory='256m', timeout=120):
    java.counter += 1
    return java(args,mounts,memory,timeout)

assert shutil.disk_usage(ROOT).free > 11*1024**3, 'Eight-GiB floor plus isolated build reserve'
for file, pin in SPEC['files'].items():
    assert sha(ROOT/'input'/file) == pin['sha256']
if (OUT/'build.json').exists():
    receipt=json.loads((OUT/'build.json').read_text())
    assert receipt['passed'] and receipt['inputsSha256']==sha(HERE/'guava-inputs.json')
    assert receipt['recipeSha256']==sha(pathlib.Path(__file__))
    assert inspect(ROW['candidate'])['Id']==receipt['imageId']
    assert sha(OUT/'penpot.jar')==receipt['jarSha256']
    print('Existing exact candidate recognized; no rebuild, assessment refresh or deployment.')
    raise SystemExit(0)
old=inspect(ROW['base']);assert old['Id']==ROW['base']
assert inspect(ROW['oldRef'])['Id']==ROW['base']
source=pathlib.Path('/var/lib/utilibre-maintenance/penpot-2.18.3-20261011/penpot.jar')
assert sha(source)==ROW['beforeSha256']
invoke(['java','-Xmx128m','-jar','/input/jarjar-assembly-1.14.1.jar','process',
        '/input/closure-rules.jarjar','/input/guava-33.7.2-jre.jar','/output/shaded.jar'],
       [(ROOT/'input','/input:ro'),(OUT,'/output')])

replacements={}
for state, file in [('main',ROOT/'input/guava-33.7.2-jre.jar'),('shaded',OUT/'shaded.jar')]:
    with zipfile.ZipFile(file) as z:
        prefix='com/google/' if state=='main' else 'com/google/javascript/jscomp/jarjar/com/google/'
        for name in z.namelist():
            if not name.endswith('/') and any(name.startswith(prefix+p) for p in ['common/','thirdparty/']):
                replacements[name]=z.read(name)
        if state=='main':
            for name in ['META-INF/maven/com.google.guava/guava/pom.properties','META-INF/maven/com.google.guava/guava/pom.xml']:
                replacements[name]=z.read(name)
            licence=z.read('META-INF/LICENSE')
prefixes=['com/google/common/','com/google/thirdparty/',
          'com/google/javascript/jscomp/jarjar/com/google/common/',
          'com/google/javascript/jscomp/jarjar/com/google/thirdparty/']
changed=[];removed=[];preserved={}
with zipfile.ZipFile(source) as z, zipfile.ZipFile(OUT/'penpot.jar','w',compression=zipfile.ZIP_DEFLATED) as output:
    assert len(z.namelist())==len(set(z.namelist())), 'Duplicate baseline ZIP entries'
    for info in z.infolist():
        name=info.filename
        if name in replacements:
            output.writestr(info,replacements.pop(name));changed.append(name)
        elif any(name.startswith(p) for p in prefixes) and '/util/concurrent/internal/' not in name and not name.endswith('/'):
            removed.append(name)
        else:
            data=z.read(name);output.writestr(info,data);preserved[name]=hashlib.sha256(data).hexdigest()
    additions={**replacements,'META-INF/utilibre/guava-33.7.2-LICENSE':licence,
               'META-INF/utilibre/closure-guava-version.txt':b'Closure Compiler v20250820 shaded Guava: 33.7.2-jre\n'}
    for name,data in sorted(additions.items()):
        info=zipfile.ZipInfo(name,(2000,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
        output.writestr(info,data)
with zipfile.ZipFile(OUT/'penpot.jar') as z:
    assert len(z.namelist())==len(set(z.namelist()))
    for name,h in preserved.items():assert hashlib.sha256(z.read(name)).hexdigest()==h
    for namespace in ['', 'com/google/javascript/jscomp/jarjar/']:
        for name in ['CompactHashMap','CompactHashSet','MapMakerInternalMap']:
            assert namespace+'com/google/common/collect/'+name+'.class' in z.namelist()
jarproof={'changed':changed,'removed':removed,'added':sorted(additions),'preservedEntries':len(preserved),
          'baselineSha256':sha(source),'candidateSha256':sha(OUT/'penpot.jar'),'independentFailureaccessPreserved':True}
(OUT/'jar-inventory.json').write_text(json.dumps(jarproof,indent=2)+'\n')
invoke(['sh','-ec','mkdir -p /tmp/compile /output/classes; cp /fixture.java /tmp/compile/GuavaSerializationCheck.java; javac -d /output/classes /tmp/compile/GuavaSerializationCheck.java'],
       [(HERE/'GuavaSerializationCheck.java','/fixture.java:ro'),(OUT,'/output')])
rows=[]
for state,jar in [('baseline',source),('fixed',OUT/'penpot.jar')]:
    for prefix in ['com.google.common.collect','com.google.javascript.jscomp.jarjar.com.google.common.collect']:
        for kind in ['CompactHashSet','CompactLinkedHashSet','CompactHashMap','CompactLinkedHashMap','MapMaker']:
            text=invoke(['java','-Xmx128m','-XX:ActiveProcessorCount=1','-cp','/app.jar:/classes',
                         'GuavaSerializationCheck',prefix,kind,state],[(jar,'/app.jar:ro'),(OUT/'classes','/classes:ro')],timeout=30)
            result=json.loads(text);assert result['passed'] and result['legitimateChecks']==5
            assert result['outOfMemory']==(state=='baseline')
            rows.append({'state':state,'namespace':prefix,'kind':kind,**result})
(OUT/'native.json').write_text(json.dumps({'passed':True,'rows':rows,'fixtureSha256':sha(HERE/'GuavaSerializationCheck.java'),
    'network':'none','maxHeapMiB':128,'jarSha256':sha(OUT/'penpot.jar')},indent=2)+'\n')

# One copied file on the actual current runtime, preserving every earlier layer.
context=pathlib.Path(tempfile.mkdtemp(prefix='image-',dir=OUT))
try:
    shutil.copyfile(OUT/'penpot.jar',context/'penpot.jar');os.chmod(context/'penpot.jar',0o644)
    (context/'Dockerfile').write_text('FROM '+ROW['base']+'\nCOPY --chown=1001:1001 penpot.jar '+ROW['jar']+'\n')
    run(['docker','build','--network=none','--pull=false','-t',ROW['candidate'],str(context)],'image-build',240)
finally:shutil.rmtree(context)
new=inspect(ROW['candidate']);assert new['Config']==old['Config'],'Image configuration drift'
assert new['RootFS']['Layers'][:-1]==old['RootFS']['Layers'],'Unexpected base layers'
archive=OUT/'candidate-layer-check.tar'
try:
    run(['docker','image','save','-o',str(archive),ROW['candidate']],'image-save',180)
    with tarfile.open(archive) as saved:
        manifest=json.load(saved.extractfile('manifest.json'));assert len(manifest)==1
        with tarfile.open(fileobj=saved.extractfile(manifest[0]['Layers'][-1])) as layer:
            entries=[e for e in layer if not e.isdir()];assert len(entries)==1
            entry=entries[0];assert '/'+entry.name==ROW['jar']
            assert entry.uid==1001 and entry.gid==1001 and entry.mode==0o644
            assert hashlib.sha256(layer.extractfile(entry).read()).hexdigest()==sha(OUT/'penpot.jar')
finally:archive.unlink(missing_ok=True)
result={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'base':ROW['base'],'candidate':ROW['candidate'],
    'imageId':new['Id'],'jarSha256':sha(OUT/'penpot.jar'),'inputsSha256':sha(HERE/'guava-inputs.json'),
    'recipeSha256':sha(pathlib.Path(__file__)),'fixtureSha256':sha(HERE/'GuavaSerializationCheck.java'),
    'configurationUnchanged':True,'changedFiles':[ROW['jar']],'unchangedOtherAppFiles':len(preserved),
    'singleLayerSingleFileVerified':True,'deployed':False}
(OUT/'build.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
