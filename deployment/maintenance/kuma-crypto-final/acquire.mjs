import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/kuma-crypto-final-20261012';fs.mkdirSync(root+'/input',{recursive:true});
const pins=[
 ['cryptography','50.0.2','cryptography-50.0.2-cp311-abi3-manylinux_2_34_x86_64.whl','9dab55f57c74c3cad24c323bacbbd04be4705ba6eb0d92e920b1fc4837ed5079','pyca/cryptography'],
 ['cryptography','50.0.2','cryptography-50.0.2.tar.gz','7b46165bb56eb4704e2eaaf86f3c940d19154535d9b0ca7d6d590b04060e00d5','pyca/cryptography'],
 ['cffi','2.1.1','cffi-2.1.1-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl','34e261f78cb6ceaaa36f42f2613f4380d94d9c759a9c73c769ee6e0247364632','python-cffi/cffi'],
 ['cffi','2.1.1','cffi-2.1.1.tar.gz','dd31f52ea1086513bb9df30f8fcee9b8918323ae067a3d5b78bc826a000712be','python-cffi/cffi'],
 ['pycparser','3.11','pycparser-3.11-py3-none-any.whl','51d5a8ba2be0bbe440b99d2112604c95bbbc3c2748a64260186c541e1729cd80','eliben/pycparser'],
 ['pycparser','3.11','pycparser-3.11.tar.gz','d875f09c3507d00e1aba0eecc6dcadc1352f30fff09dc6bff2f1c2935e97c2bc','eliben/pycparser'],
];
const sha=b=>createHash('sha256').update(b).digest('hex'),rows=[];
for(const[project,version,filename,hash,repository]of pins){const response=await fetch('https://pypi.org/pypi/'+project+'/'+version+'/json');assert(response.ok);const metadata=await response.json(),entry=metadata.urls.find(f=>f.filename===filename);assert(entry&&!entry.yanked);assert.equal(entry.digests.sha256,hash);assert.equal(new URL(entry.url).host,'files.pythonhosted.org');const path=root+'/input/'+filename;if(!fs.existsSync(path)){const r=await fetch(entry.url);assert(r.ok);fs.writeFileSync(path,Buffer.from(await r.arrayBuffer()),{flag:'wx'});}assert.equal(sha(fs.readFileSync(path)),hash);
 const proof=await fetch('https://pypi.org/integrity/'+project+'/'+version+'/'+filename+'/provenance');let provenance='not published; HTTPS PyPI release metadata and independently pinned artifact SHA-256 only';if(proof.ok){const p=await proof.json();assert(p.attestation_bundles.every(a=>a.publisher.kind==='GitHub'&&a.publisher.repository===repository));fs.writeFileSync(path+'.provenance.json',JSON.stringify(p)+'\n');provenance='downloaded, cryptographic verification pending';}else{assert.equal(proof.status,404);assert.notEqual(project,'cryptography','Cryptography publisher attestation required');}rows.push({project,version,filename,sha256:hash,bytes:entry.size,repository,url:entry.url,requires:metadata.info.requires_dist,license:metadata.info.license_expression||metadata.info.license,provenance});
}
fs.writeFileSync(root+'/acquisition.json',JSON.stringify({date:new Date().toISOString(),rows},null,2)+'\n');console.log(rows.map(r=>({file:r.filename,bytes:r.bytes,repository:r.repository})));
