// Additive erratum: historical release evidence must not be overwritten.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root,read,sha} from './common.mjs';
process.umask(0o077);
const file=root+'/documentation-correction.json';assert(!fs.existsSync(file));
const release=read(root+'/release.json');assert.equal(release.status,'passed');
for(const [name,hash]of Object.entries(release.proofs))assert.equal(sha(fs.readFileSync(root+'/'+name+'.json')),hash);
const paths=['doc/libtiff.rst','doc/functions/TIFFOpenOptions.rst'],records=[];
for(const path of paths){
 const bytes=execFileSync('tar',['-xOf',root+'/sources/tiff_4.7.2.orig.tar.bz2','libtiff-v4.7.2/'+path]);
 const text=bytes.toString('utf8');assert(text.includes('TIFFOpenOptionsSetMaxSingleMemAlloc'));
 if(path.endsWith('TIFFOpenOptions.rst'))assert(text.includes('**do not apply**'));
 else assert(text.includes('limit in bytes'));
 records.push({path,sha256:sha(bytes)});
}
const v2=read(root+'/source-offer-v2.json');
const report={schema:1,date:new Date().toISOString(),status:'passed',correctAdvisory:'CVE-2023-52355',incorrectDescriptiveIdentifier:'CVE-2026-52355',correction:'The initial README and descriptive vendor audit contained the wrong year for the documentation-only issue. This changes no compiled code, binary package, release proof, source authentication, or verdict for CVE-2026-12912/36849.',originalSourceSha256:read(root+'/source-offer.json').sha256,correctedSourceSha256:v2.sha256,originalReleaseSha256:sha(fs.readFileSync(root+'/release.json')),upstreamDocumentation:records,primary:'https://security-tracker.debian.org/tracker/CVE-2023-52355',upstreamCommits:['335947359ce2dd3862cd9f7c49f92eba065dfed4','16ab4a205cfc938c32686e8d697d048fabf97ed4'],limit:'Upstream resolution is documentation, not a new runtime memory-allocation fix. This is not a guarantee against malformed-input denial of service.'};
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',correctAdvisory:report.correctAdvisory,receiptsUnchanged:true}));
