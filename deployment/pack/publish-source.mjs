// Complete pinned upstream source plus the matching local build/config recipes.
// This never archives a runtime data directory, environment file or credential.
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,writeFile,lstat,copyFile,rename,readlink} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const applications={
  'it-tools':['it-tools','5732483fc24a6e6818839060bdf3cc7d9d324b9f'],
  mapshaper:['mapshaper','9e39193444f70a48eeffda20d8d44f82567e6d54'],
  numbat:['numbat','79046422203060e296da41c8c762c506200d2c93'],
  'super-productivity':['super-productivity','42ded9f31a132bf92633b0c78ad4ebf1d87c0f71'],
  cryptpad:['cryptpad','c4a257e46919ba2e4e710c26f7e5dc067686e2b5'],
  liberaforms:['liberaforms','4d5967411a8c53742501c84142cdcf9aeca0860e'],
  galene:['galene','6d9338e909fdecdd906150e4dda34e10d9869654'],
  bentopdf:['bentopdf','f96cd4e5166f3d51393dfe9f3c440b5bb77802f1'],
  omnitools:['omnitools','922b28ce154e8f22da4a721472889717a95f7562'],
};
const name=process.argv[2],spec=applications[name];assert(spec,'Select one reviewed pack application');
const root=`/opt/utilibre/src/${spec[0]}`;
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),spec[1]);
const paths=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(name==='cryptpad')paths.push('customize/application_config.js','customize/ckeditor-config.js');
const files=[];
for(const p of new Set(paths)){
  assert(!p.startsWith('/')&&!p.split('/').includes('..'));
  assert(!/(^|\/)(?:node_modules|secrets|backups|\.git|\.env)(\/|$)/.test(p),`Unsafe archive entry ${p}`);
  // Git submodules are represented by directories; their pinned revision and
  // normal upstream dependency installer remain in the source tree.
  const s=await lstat(`${root}/${p}`);if(s.isDirectory())continue;
  if(s.isSymbolicLink()){
    const link=await readlink(`${root}/${p}`);
    assert(!path.isAbsolute(link)&&path.resolve(root,path.dirname(p),link).startsWith(root+'/'),`Unsafe source symlink ${p}`);
  }
  // tar retains safe upstream links; never dereference into runtime directories.
  files.push(p);
}
const stage=await mkdtemp('/opt/utilibre/pack-source-');
await writeFile(`${stage}/upstream-files`,files.join('\0')+'\0');
await mkdir('/opt/utilibre/toolbox-public',{recursive:true});
// Include reviewed integration files only, never .env or private runtime state.
const integration=execFileSync('git',['ls-files','-z','deployment/pack','deployment/toolbox','deployment/expanded','docs/service-pack.md'],{encoding:'utf8'}).split('\0').filter(Boolean);
assert(integration.includes('deployment/pack/publish-source.mjs'),'Stage the reviewed release before source publication');
for(const p of integration)assert(!/(^|\/)(?:node_modules|secrets|backups|\.env)(\/|$)/.test(p)&&!(await lstat(p)).isSymbolicLink());
await writeFile(`${stage}/integration-files`,integration.join('\0')+'\0');
execFileSync('tar',['-czf',`${stage}/${name}-utilibre.tar.gz`,'-C',root,'--null','-T',`${stage}/upstream-files`,'-C',process.cwd(),'--null','-T',`${stage}/integration-files`],{stdio:'pipe'});
const destination=`/opt/utilibre/toolbox-public/${name}-utilibre.tar.gz`;
try{await copyFile(destination,`${stage}/previous.tar.gz`)}catch(e){if(e.code!=='ENOENT')throw e}
await rename(`${stage}/${name}-utilibre.tar.gz`,destination);
console.log(`Published ${name} at pinned revision ${spec[1]}; prior archive retained when present.`);
