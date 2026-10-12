import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,spec,sha,docker,read} from './common.mjs';
process.umask(0o077);
fs.mkdirSync(root+'/output',{recursive:true});
const b=spec.builder,w=spec.builderWork;
docker('cp',b+':'+w+'/build.log',root+'/build.log');const log=fs.readFileSync(root+'/build.log','utf8');
assert(log.includes('HDF5_DEBIAN_SERIAL_BUILD_PASSED'));assert(log.includes('HDF5_CORRESPONDING_SOURCE_PASSED'));
const initialAttempts={};for(const file of ['build-root-permission-attempt.log','build-resume-rule-attempt.log','build-test-passed-rule-attempt.log','build-makeflags-rule-attempt.log']){
 const exists=docker('exec',b,'sh','-ec','if test -f '+w+'/'+file+'; then echo yes; fi');
 if(exists==='yes'){docker('cp',b+':'+w+'/'+file,root+'/'+file);initialAttempts[file]=sha(fs.readFileSync(root+'/'+file));}
}
const names=[...spec.packages.map(p=>p+'_'+spec.version+'_amd64.deb'),'hdf5_'+spec.version+'.dsc','hdf5_'+spec.version+'.debian.tar.xz','hdf5_'+spec.version+'_amd64.buildinfo'];
for(const name of names)docker('cp',b+':'+w+'/'+name,root+'/output/'+name);
const files=Object.fromEntries(names.map(name=>[name,{bytes:fs.statSync(root+'/output/'+name).size,sha256:sha(fs.readFileSync(root+'/output/'+name))}]));
const completed=docker('exec',b,'find',w+'/tree/debian/build-serial','-name','*.chkexe','-type','f').split('\n').filter(Boolean).map(p=>p.replace(w+'/tree/debian/build-serial/','')).sort();
assert(completed.length>80,'Serial upstream test-completion evidence is incomplete');
docker('exec',b,'sh','-ec','cd '+w+'/tree; find debian/build-serial -name "*.chklog" -type f -print0 | tar --null -T - -czf ../upstream-test-logs.tar.gz');
docker('cp',b+':'+w+'/upstream-test-logs.tar.gz',root+'/output/upstream-test-logs.tar.gz');
const skipped=docker('exec',b,'sh','-ec','cd '+w+'/tree; find debian/build-serial -name "*.chklog" -type f -exec grep -H -i -E "SKIP|not configured|not tested|not available" {} + || test "$?" = 1');
const vendor=docker('exec',b,'sh','-ec','cd '+w+'/tree; cat .pc/applied-patches; while IFS= read -r patch; do sha256sum "debian/patches/$patch"; done < .pc/applied-patches');
assert(vendor.includes(spec.adjustedPatchSha256+'  debian/patches/utilibre-CVE-2018-11205.patch'));
fs.writeFileSync(root+'/output/build-dependencies.tsv',docker('exec',b,'dpkg-query','-W','-f=${binary:Package}\t${Version}\n')+'\n');
docker('cp',new URL('native.c',import.meta.url).pathname,b+':'+w+'/recipe/native.c');
docker('exec',b,'cc','-O2','-Wall','-Wextra','-Werror','-I/usr/include/hdf5/serial','-I/usr/include/gdal',w+'/recipe/native.c','-lhdf5_serial_hl','-lhdf5_serial','-lnetcdf','-lgdal','-o',w+'/native');
docker('cp',b+':'+w+'/native',root+'/output/native');fs.chmodSync(root+'/output/native',0o755);
const record={schema:1,date:new Date().toISOString(),status:'passed',version:spec.version,files,vendor,buildLogSha256:sha(log),initialAttempts,authenticatedSha256:sha(fs.readFileSync(root+'/source/authenticated.json')),serialFullBuildAndTests:true,completedUpstreamPrograms:completed,upstreamLogsSha256:sha(fs.readFileSync(root+'/output/upstream-test-logs.tar.gz')),skippedSubcaseEvidence:skipped,mpiVariants:'not built: not installed in target',nativeCompiledAgainstOriginalHeaders:true,nativeSha256:sha(fs.readFileSync(root+'/output/native')),productionChanged:false};
fs.writeFileSync(root+'/native-build.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,files}));
