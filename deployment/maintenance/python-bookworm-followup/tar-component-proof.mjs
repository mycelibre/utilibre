// Exact runtime evidence only. No verdict is written to the security ledger.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const out='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012/tar-baseline.json';
assert(!fs.existsSync(out),'Preserve the original runtime evidence');
const run=args=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Read-only Python runtime proof failed');}};
const script=`import hashlib,inspect,io,json,tarfile
assert 'filter' not in inspect.signature(tarfile.TarFile.extractall).parameters
assert not any(hasattr(tarfile,n) for n in ['data_filter','tar_filter','LinkFallbackError'])
assert not hasattr(tarfile.TarFile,'makelink_with_filter')
memory=io.BytesIO()
with tarfile.open(fileobj=memory,mode='w'): pass
memory.seek(0)
with tarfile.open(fileobj=memory) as archive:
 try: archive.extractall(filter='data')
 except TypeError as error: assert 'filter' in str(error)
 else: raise AssertionError('Unexpected filter implementation')
print(json.dumps({'passed':True,'tarfileSha256':hashlib.sha256(open(tarfile.__file__,'rb').read()).hexdigest(),'signature':str(inspect.signature(tarfile.TarFile.extractall)),'filterKeywordRejected':True,'filterImplementationAbsent':True}))`;
const rows=[];
for(const name of ['utilibre-community-uptime-kuma-1','utilibre-gathio-postgres-1']){
 const image=run(['inspect','--format','{{.Image}}',name]);
 const result=JSON.parse(run(['exec',name,'python3','-B','-c',script]));
 assert.equal(result.tarfileSha256,'f697df24384495d0ebfcc90e9d684ab0cfb7127fd33f4adaf29fd44c92be9a91');
 assert.equal(run(['inspect','--format','{{.Image}}',name]),image);
 rows.push({name,image,...result});
}
fs.writeFileSync(out,JSON.stringify({date:new Date().toISOString(),rows,
 scope:'CVE-2026-11940 bypasses extraction filters absent in this exact Debian payload.',
 limitation:'Default extraction of untrusted archives is NOT made safe; no blanket tarfile or service exemption.',
 sources:['https://security-tracker.debian.org/tracker/CVE-2026-11940','https://github.com/python/cpython/commit/be13e86f6b9788a6f4d0419dffef72cbae5865c9']},null,2)+'\n',{mode:0o600});
console.log('Both current Debian tarfile payloads reject the absent filter API; exact image-bound proof saved. No security decision applied.');
