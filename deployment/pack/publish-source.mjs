// Complete pinned upstream source plus the matching local build/config recipes.
// This never archives a runtime data directory, environment file or credential.
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,writeFile,lstat,copyFile,rename,readlink} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const applications={
  ...Object.fromEntries(['freshrss','radicale','calino','one-file-core','link-cleaner','drawio'].map(id=>[id,[id,'reviewed-below']])),
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
const refresh={
  bentopdf:'f638f8e4db66cb69dec35ca061ad89034dd62445',
  mapshaper:'b44c0fa95effac3d91526c8b62dc0de0ab88b464',
  freshrss:'08f97bd497ace733c151ea1c709d85cd5b65cc53',
  radicale:'4d3887e0fe5f4d3cf815d65e2a4d8bf9b0ca5b75',
  calino:'5923ea08e63a6e420ef372db84a97b4971346493',
  'one-file-core':'7439c0f78b64aad87f1e71c62e593536e3faf3bb',
  'link-cleaner':'e3bf8286e1d6dada00099eef2c392df2088e743a',
  drawio:'c72c9a98b7a6ce392556ed04c05e0ff19f43f5c3',
};
const root=name==='bentopdf'?'/var/lib/utilibre-maintenance/releases-20261111/bentopdf':refresh[name]?`/var/lib/utilibre-maintenance/releases-20261106/${name}`:`/opt/utilibre/src/${spec[0]}`;
if(refresh[name])spec[1]=refresh[name];
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),spec[1]);
const paths=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(name==='cryptpad')paths.push('customize/application_config.js','customize/ckeditor-config.js');
const files=[];
for(const p of new Set(paths)){
  assert(!p.startsWith('/')&&!p.split('/').includes('..'));
  // Calino commits a public VITE_SITE_URL default in .env. Permit only its
  // reviewed exact upstream bytes, never a local runtime environment file.
  const publicDefault=name==='calino'&&p==='.env'&&createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')==='14a017506554fcc5d37b8950b19616c02b9e72b10858440128c3e5f4227489eb';
  assert(publicDefault||!/(^|\/)(?:node_modules|secrets|backups|\.git|\.env)(\/|$)/.test(p),`Unsafe archive entry ${p}`);
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
const prefixes=['deployment/pack/','deployment/toolbox/','deployment/expanded/','deployment/calendar/','deployment/link-cleaner/','deployment/one-file-core/','deployment/maintenance/release-refresh-20261106/','deployment/utilibre/','docs/records/release-refresh-2026-11-06.md','docs/service-pack.md'];
const integration=execFileSync('git',['ls-tree','-r','--name-only','-z','HEAD'],{encoding:'utf8'}).split('\0').filter(p=>p&&prefixes.some(prefix=>p.startsWith(prefix)));
if(name==='bentopdf')integration.push(...execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','deployment/maintenance/releases-20261111','docs/records/bentopdf-updater-2026-11-11.md'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));
assert(integration.includes('deployment/pack/publish-source.mjs'),'Stage the reviewed release before source publication');
for(const p of integration)assert(!/(^|\/)(?:node_modules|secrets|backups|\.env)(\/|$)/.test(p)&&!(await lstat(p)).isSymbolicLink());
await writeFile(`${stage}/integration-files`,integration.join('\0')+'\0');
await mkdir(`${stage}/integration`);
execFileSync('git',['archive','--format=tar',`--output=${stage}/integration.tar`,'HEAD','--',...integration]);
execFileSync('tar',['-xf',`${stage}/integration.tar`,'-C',`${stage}/integration`]);
if(name==='bentopdf'){
  const component='/var/lib/utilibre-maintenance/releases-20261111/hyper-compress-1.0.3-source.tar.gz';
  assert.equal(createHash('sha256').update(await readFile(component)).digest('hex'),'562522f3acdb6ce85d3b355526a6ba433cdfc2ccc32ec5d16bc8d7a9d9d42be2');
  await mkdir(`${stage}/integration/components`);
  await copyFile(component,`${stage}/integration/components/hyper-compress-1.0.3-source.tar.gz`);
  integration.push('components/hyper-compress-1.0.3-source.tar.gz');
  await writeFile(`${stage}/integration-files`,integration.join('\0')+'\0');
}
execFileSync('tar',['-czf',`${stage}/${name}-utilibre.tar.gz`,'-C',root,'--null','-T',`${stage}/upstream-files`,'-C',`${stage}/integration`,'--null','-T',`${stage}/integration-files`],{stdio:'pipe'});
const destination=`/opt/utilibre/toolbox-public/${name}-utilibre.tar.gz`;
try{await copyFile(destination,`${stage}/previous.tar.gz`)}catch(e){if(e.code!=='ENOENT')throw e}
await rename(`${stage}/${name}-utilibre.tar.gz`,destination);
console.log(`Published ${name} at pinned revision ${spec[1]}; prior archive retained when present.`);
