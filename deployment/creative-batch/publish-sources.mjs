// Corresponding source: pinned upstream tree, exact local patch and build glue.
// Explicit allowlist: no runtime data, credentials, caches or node_modules.
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,copyFileSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
const root='/opt/utilibre/creative-batch/public';mkdirSync(root,{recursive:true});
const items={
 openreel:['openreel','c9340465e5d37e684cc25bdbe746c4ccd45e165c'],
 floorplan:['openplan3d','d68cadf703578f2cd3a7c77f820e18d342580c32'],
 blockbench:['blockbench','7c92e27d237e365110030d73e92c5d1605f0d311'],
 glyphr:['glyphr','e12bb922f74a2e410c5ac580eebcb485aff0ad51'],
 jscad:['jscad','f245ea3a5072024b789f276c6fb9ce6c3eb3fd0d'],
 grid:['grid','d138275bbe9d4e4030d8cb8b2dcf66607da9295a'],
 fossflow:['fossflow','a3c5b7cafb8f2573e26a8dd086d51f037feb9fb6'],
 vvveb:['vvvebjs','1acbab7ebfe3e7b004f1f18c039d26550fc04bd8'],
};
for(const [name,[folder,revision]]of Object.entries(items)){
 const src='/opt/utilibre/evaluation-src/'+folder+'-20261011',dst=root+'/'+name;
 if(execFileSync('git',['rev-parse','HEAD'],{cwd:src,encoding:'utf8'}).trim()!==revision)throw Error('Source mismatch');
 const tmp=mkdtempSync('/opt/utilibre/creative-source-');mkdirSync(dst,{recursive:true});
 try{
  execFileSync('git',['archive','--format=tar','--prefix='+name+'/', '--output='+tmp+'/upstream.tar',revision],{cwd:src});
  execFileSync('tar',['-xf',tmp+'/upstream.tar','-C',tmp]);
  const bundle=tmp+'/'+name,glue=bundle+'/utilibre';mkdirSync(glue);
  const patch=execFileSync('git',['diff','--binary','HEAD'],{cwd:src,maxBuffer:20*1024*1024});
  writeFileSync(glue+'/changes.patch',patch);
  if(patch.length)execFileSync('git',['apply',glue+'/changes.patch'],{cwd:bundle});
  // These reviewed lockfiles did not exist in the original upstream trees.
  if(existsSync(src+'/package-lock.json'))copyFileSync(src+'/package-lock.json',bundle+'/package-lock.json');
  for(const file of [name+'-prepare.mjs','publish-static.mjs','static-config.mjs','grid-publish.mjs','Dockerfile.glyphr','glyphr-nginx.conf']){
   const path=new URL('./'+file,import.meta.url);if(existsSync(path))copyFileSync(path,glue+'/'+file);
  }
  writeFileSync(glue+'/BUILD.txt',`Utilibre, 11 October 2026. Pinned upstream ${revision}.\nThe included source already contains changes.patch. Upstream license notices remain.\nDeployment/build instructions: https://github.com/mycelibre/utilibre/blob/main/docs/creative-batch-2026-10-11.md\nBuild glue is included alongside this file; prepare scripts verify the pinned Git checkout.\nNo user content, credentials or build caches are included. No remote runtime asset provider is needed for the documented workflow.\n`);
  execFileSync('tar',['-czf',dst+'/source.tar.gz','-C',tmp,name]);
 }finally{rmSync(tmp,{recursive:true,force:true});}
 writeFileSync(dst+'/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="description" content="Pinned source code, licence notices and Utilibre privacy changes for ${name}."><title>Source code · ${name} · Utilibre</title></head><body><h1>Source code / Código fuente</h1><p>${name} — ${revision}</p><p><a href="source.tar.gz">Download source, notices and build material / Descargar código, avisos e instrucciones</a></p><p><a href="https://utilibre.org/">Utilibre</a></p></body></html>`);
 console.log(name+': source offer published');
}
