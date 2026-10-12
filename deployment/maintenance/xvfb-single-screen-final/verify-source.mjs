// Fail closed on missing quilt fixes, wrong compiler flags or changed payloads.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{strictReverse,applyVendorSeries}from'../xserver-followup/source-proof.mjs';import{fixes}from'../xserver-followup/host-policy.mjs';
const root='/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012',sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),source=JSON.parse(fs.readFileSync(root+'/source.json')),records=[];
for(const row of source.rows){
 for(const a of row.archives){assert.equal(sha(row.dir+'/'+a.file),a.sha256);assert.equal(fs.statSync(row.dir+'/'+a.file).size,a.bytes)}
 const temp=fs.mkdtempSync(root+'/proof-');try{
  cp.execFileSync('dpkg-source',['-x',row.dir+'/'+row.dsc,temp+'/source'],{stdio:'pipe'});const series=applyVendorSeries(temp+'/source');
  for(const[id,fix]of Object.entries(fixes)){const p=root+'/output/'+id+'.patch';assert.equal(sha(p),fix.sha256);strictReverse(temp+'/source',p)}
  const built=root+'/work/source-'+row.role,read=p=>fs.readFileSync(temp+'/source/'+p,'utf8');
  const paths=['include/misc.h','dix/dispatch.c','hw/vfb/InitOutput.c','Xext/panoramiX.c','debian/rules.flags'];for(const p of paths)assert.equal(sha(built+'/'+p),sha(temp+'/source/'+p));
  assert.match(read('include/misc.h'),/#ifndef MAXSCREENS\s+#define MAXSCREENS\s+16\s+#endif/);
  assert.match(read('dix/dispatch.c'),/i = screenInfo.numScreens;\s+if \(i == MAXSCREENS\)\s+return -1;/);
  assert.match(read('hw/vfb/InitOutput.c'),/if \(-1 == AddScreen\(vfbScreenInit, argc, argv\)\) \{\s+FatalError\("Couldn't add screen %d", i\);/);
  const x=read('Xext/panoramiX.c');assert.deepEqual([...x.matchAll(/PanoramiXNumScreens\s*=\s*([^=;]+);/g)].map(m=>m[1]),['0','screenInfo.numScreens']);assert.match(x,/PanoramiXNumScreens = screenInfo.numScreens;\s+if \(PanoramiXNumScreens == 1\) \{[^}]*noPanoramiXExtension = TRUE;[^}]*return;/);
  const make=fs.readFileSync(root+'/work/build-'+row.role+'/hw/vfb/Makefile','utf8'),line=key=>make.split('\n').find(l=>l.startsWith(key+' = '));assert.match(line('CPPFLAGS'),/ -DMAXSCREENS=1$/);assert.match(line('CFLAGS'),/ -fstack-protector-strong .* -Wno-error=array-bounds /);assert(!make.includes('-Wno-array-bounds'));for(const flag of ['-Wl,-z,relro','-Wl,-z,now','-Wl,-Bsymbolic'])assert(line('LDFLAGS').split(/\s+/).includes(flag));
  const log=fs.readFileSync(root+'/'+row.role+'-build.log','utf8');assert.match(log,/# PASS:\s+1/);assert.match(log,/# SKIP:\s+1/);assert.match(log,/# FAIL:\s+0/);
  records.push({role:row.role,version:row.version,archives:row.archives,series,sourcePaths:Object.fromEntries(paths.map(p=>[p,sha(built+'/'+p)])),binarySha256:sha(root+'/output/Xvfb-'+row.role),buildLogSha256:sha(root+'/'+row.role+'-build.log'),buildMakefileSha256:sha(root+'/work/build-'+row.role+'/hw/vfb/Makefile'),fixes,compileRestriction:'MAXSCREENS=1',warningsRetained:true,upstreamCheck:{pass:1,skip:1,fail:0,limitation:'Selected native Xvfb harness; Piglit unavailable. This is not the complete Xorg DDX test suite.'}});
 }finally{fs.rmSync(temp,{recursive:true})}
}
fs.writeFileSync(root+'/source-checks.json',JSON.stringify({date:new Date().toISOString(),passed:true,records,method:'Fresh authenticated native sources, complete quilt series, forced zero-fuzz reverse proofs, exact compile flags and bounded native tests.',productionChanged:false},null,2)+'\n');console.log('Both native source/series/build proofs passed');
