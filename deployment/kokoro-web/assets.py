#!/usr/bin/env python3
"""Verify pinned model bytes and copy only the reviewed browser runtime assets."""
import hashlib,json,pathlib,shutil,sys,urllib.request
recipe=pathlib.Path(__file__).resolve().parent
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/opt/utilibre/src/kokoro-web')
phonemizer=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/opt/utilibre/build/kokoro-espeak/output')
out=root/'static/assets';out.mkdir(parents=True,exist_ok=True)
for item in json.loads((recipe/'phonemizer-manifest.json').read_text())['files']:
 name=item['path'];source=phonemizer/name
 if not source.is_file():raise SystemExit('Build the pinned phonemizer before staging its runtime')
 if source.stat().st_size!=item['bytes'] or hashlib.file_digest(source.open('rb'),'sha256').hexdigest()!=item['sha256']:raise ValueError('Phonemizer differs from reviewed build: '+name)
 shutil.copy2(source,out/name)
for name in ['notyf.min.js','notyf.min.css']:shutil.copy2(root/'node_modules/notyf'/name,out/name)
ort=out/'ort';ort.mkdir(exist_ok=True)
for pattern in ['*.wasm','ort-wasm*.mjs']:
 for source in (root/'node_modules/onnxruntime-web/dist').glob(pattern):shutil.copy2(source,ort/source.name)
manifest=json.loads((recipe/'model-manifest.json').read_text())
for item in manifest:
 target=out/'model'/item['path'];target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():
  temp=target.with_suffix(target.suffix+'.partial')
  try:
   with urllib.request.urlopen(item['url'],timeout=90) as response,temp.open('wb') as dest:shutil.copyfileobj(response,dest)
   if temp.stat().st_size!=item['bytes'] or hashlib.file_digest(temp.open('rb'),'sha256').hexdigest()!=item['sha256']:raise ValueError('Pinned model hash mismatch: '+item['path'])
   temp.replace(target)
  finally:temp.unlink(missing_ok=True)
 if target.stat().st_size!=item['bytes'] or hashlib.file_digest(target.open('rb'),'sha256').hexdigest()!=item['sha256']:raise ValueError('Pinned model hash mismatch: '+item['path'])
shutil.copy2(recipe/'model-manifest.json',out/'model-manifest.json')
# FFmpeg is not distributed: this instance keeps native WAV output at speed1.
shutil.rmtree(out/'ffmpeg',ignore_errors=True)
shutil.rmtree(out/'notices',ignore_errors=True)
shutil.copytree(recipe/'notices',out/'notices')
print(json.dumps({'assetBytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'modelFilesVerified':len(manifest)}))
