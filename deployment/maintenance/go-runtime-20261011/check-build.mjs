// Compare exact compiled dependency inventories; never inspect service secrets.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='/var/lib/utilibre-maintenance/go-runtime-20261011';
const compiler='golang:1.27.2-bookworm@sha256:5cf287a799e6b94384bad13d16b14904c531f51ba65792237e122ce42b392f61';
const rows=[];
for(const name of ['fmd-server','fmd-server-ctl','yopass','yopass-server']){
 const info=execFileSync('docker',['run','--rm','--network','none','--read-only','--cpus','.5','--memory','128m','--log-driver','none','-v',directory+':/review:ro',compiler,'go','version','-m','/review/input/'+name,'/review/output/'+name],{encoding:'utf8',timeout:30000});
 const chunks=info.trim().split(/\n(?=\/review\/output\/)/);assert.equal(chunks.length,2);
 const dependencies=v=>v.split('\n').filter(x=>x.startsWith('\tdep\t')).sort();assert.deepEqual(dependencies(chunks[0]),dependencies(chunks[1]),name+' dependency changes');
 const fmd=name.startsWith('fmd');const version=fmd?'go1.26.9':'go1.27.2',revision=fmd?'224b60c0756ff363bc19063082a8a1543559cf96':'34d8bbcc4aac14dbf326d46dc69d26895b7f5282';
 assert(chunks[1].split('\n')[0].endsWith(version));assert(chunks[1].includes('vcs.revision='+revision));assert(!chunks[1].includes('(devel)'));assert(chunks[1].includes('CGO_ENABLED='+(fmd?'0':'1')));
 const bytes=await readFile(directory+'/output/'+name);const sha256=createHash('sha256').update(bytes).digest('hex');
 rows.push({binary:name,compiler:version,sourceRevision:revision,sha256,bytes:bytes.length,unchangedDependencies:dependencies(chunks[1]).length,cgo:fmd?0:1});
}
const report={status:'passed',date:new Date().toISOString(),sourceChanges:false,moduleChanges:false,rows};await writeFile(directory+'/build-verification.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
