// Ordinary compatibility only. No exploit fixtures, activation or finding closure.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {read, sha, root, limits} from './common.mjs';

const hash = /^[a-f0-9]{64}$/;
const libraryPaths = new Set([
  '/usr/lib/x86_64-linux-gnu/libacl.so.1.1.2301',
  '/usr/lib/x86_64-linux-gnu/libacl.so.1.1.2302',
]);
export function validate(input) {
  assert.equal(input.schemaVersion, 1);
  assert.equal(input.permission, 'isolated-compatibility-only');
  assert.equal(input.securityClosureAllowed, false);
  assert.equal(input.candidateVersion, '2.4.0-1~deb12u1+utilibre1');
  assert(hash.test(input.candidateLibrarySha256));
  assert(hash.test(input.sourceAuthenticationSha256));
  assert(hash.test(input.nativeBuildReceiptSha256));
  assert(input.files.length > 0 && input.files.length <= 10);
  const names = new Set();
  for (const f of input.files) {
    assert(/^(?:sources|output)\/acl[_a-z0-9.+~\-]*\.(?:deb|dsc|xz|asc)$/.test(f.path)
      || /^output\/libacl1_2\.4\.0-1~deb12u1\+utilibre1_amd64\.deb$/.test(f.path));
    assert(hash.test(f.sha256)); assert(!names.has(f.path)); names.add(f.path);
  }
  assert.deepEqual([...names].sort(),[
    'sources/acl_2.3.1-3_amd64.deb',
    'sources/acl_2.4.0-1.debian.tar.xz', 'sources/acl_2.4.0-1.dsc',
    'sources/acl_2.4.0.orig.tar.xz', 'sources/acl_2.4.0.orig.tar.xz.asc',
    'output/acl_2.4.0-1~deb12u1+utilibre1_amd64.deb',
    'output/libacl1_2.4.0-1~deb12u1+utilibre1_amd64.deb',
  ].sort(), 'All source, rollback-tool and candidate packages must be pinned');
  assert(input.targets.length > 0 && input.targets.length <= 40);
  const ids = new Set();
  for (const row of input.targets) {
    assert(row.artifact === 'host-dpkg' || /^sha256:[a-f0-9]{64}$/.test(row.artifact));
    assert(!ids.has(row.artifact)); ids.add(row.artifact);
    assert(['2.3.1-3','2.3.2-2+b1','2.3.2-2+dhi1'].includes(row.version));
    assert(libraryPaths.has(row.libraryPath)); assert(hash.test(row.librarySha256));
    assert.equal(typeof row.rsyncExpected, 'boolean');
    assert(row.roles.length > 0 && row.roles.every(x => /^[a-z0-9-]+$/.test(x)));
  }
  return input;
}

const ordinary = `set -eu
test "$(dpkg-query -W -f='\${Version}' libacl1)" = "$1"
test "$(sha256sum "$2" | cut -d ' ' -f 1)" = "$3"
setfacl=/fixtures/old/bin/setfacl
getfacl=/fixtures/old/bin/getfacl
mkdir /tmp/work
cd /tmp/work
mkdir source restored copied
printf 'Fictional permission-preserving archive example\n' > source/example.txt
"$setfacl" -m u:1:r-- source/example.txt
"$setfacl" -m u:1:r-x,d:u:1:r-x source
"$getfacl" -cpn source/example.txt > expected-file
"$getfacl" -cpn source > expected-directory
cp -a source/. copied/
tar --acls -cf example.tar -C source .
tar --acls -xf example.tar -C restored
for target in copied restored; do
  cmp source/example.txt "$target/example.txt"
  "$getfacl" -cpn "$target/example.txt" > actual-file
  "$getfacl" -cpn "$target" > actual-directory
  cmp expected-file actual-file
  cmp expected-directory actual-directory
done
mv copied/example.txt copied/renamed.txt
cmp source/example.txt copied/renamed.txt
"$getfacl" -cpn copied/renamed.txt > actual-file
cmp expected-file actual-file
if test "$4" = true; then
  mkdir synced
  rsync -aA --numeric-ids source/ synced/
  cmp source/example.txt synced/example.txt
  "$getfacl" -cpn synced/example.txt > actual-file
  "$getfacl" -cpn synced > actual-directory
  cmp expected-file actual-file
  cmp expected-directory actual-directory
fi
if test "$5" = candidate; then
  /fixtures/new/usr/bin/getfacl -cpn source/example.txt > current-file
  /fixtures/new/usr/bin/getfacl -cpn source > current-directory
  cmp expected-file current-file
  cmp expected-directory current-directory
fi
printf 'ordinary-acl-copy-archive-rename-pass\n'
`;

function execute(program,args,options={}) {
  return cp.execFileSync(program,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024,
    stdio:['ignore','pipe','pipe'],...options});
}
function exportsOf(p) {
  return execute('readelf',['--dyn-syms','--wide',p]).split('\n')
    .filter(l=>/\bGLOBAL\b|\bWEAK\b/.test(l)).filter(l=>! /\bUND\b/.test(l))
    .map(l=>l.trim().split(/\s+/)[7]).filter(Boolean).sort();
}
export function main(manifest,output) {
  process.umask(0o077);
  assert(path.isAbsolute(output) && output.startsWith('/var/lib/utilibre-maintenance/'));
  assert.equal(path.resolve(output),output);
  assert(!output.includes(',') && !fs.existsSync(output), 'Use a new private output directory');
  const input=validate(read(manifest));
  assert.equal(sha(fs.readFileSync(root+'/acl-source-authentication.json')),input.sourceAuthenticationSha256);
  assert.equal(sha(fs.readFileSync(root+'/acl-native.json')),input.nativeBuildReceiptSha256);
  for(const f of input.files) assert.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path);
  const space=fs.statfsSync(path.dirname(output));
  assert(space.bavail*space.bsize >= 256*1024*1024, 'Insufficient scratch space');
  fs.mkdirSync(output,{mode:0o700});
  const fixtures=output+'/fixtures'; fs.mkdirSync(fixtures,{mode:0o755});
  // Public package bytes only; keep the enclosing evidence directory private.
  fs.chmodSync(fixtures,0o755);
  execute('dpkg-deb',['-x',root+'/sources/acl_2.3.1-3_amd64.deb',fixtures+'/old']);
  execute('dpkg-deb',['-x',root+'/output/acl_'+input.candidateVersion+'_amd64.deb',fixtures+'/new']);
  execute('dpkg-deb',['-x',root+'/output/libacl1_'+input.candidateVersion+'_amd64.deb',fixtures+'/new']);
  for(const f of ['/old/bin/setfacl','/old/bin/getfacl','/new/usr/bin/getfacl']) {
    assert(fs.statSync(fixtures+f).mode & 0o001, 'Fixture command must be executable by the isolated test user');
  }
  const candidate=fixtures+'/new/usr/lib/x86_64-linux-gnu/libacl.so.1.2.2400';
  assert.equal(sha(fs.readFileSync(candidate)),input.candidateLibrarySha256);
  const candidateExports=new Set(exportsOf(candidate)), results=[];
  let sequence=0;
  const isolated=(row,args,mounts=[],binary=false)=>{
    const name='utilibre-acl-compat-'+process.pid+'-'+(++sequence);
    try {
      return execute('docker',['run','--pull=never','--name',name,...limits,'--read-only',
        '--user','65534:65534','--tmpfs','/tmp:rw,nosuid,nodev,size=16m,mode=1777',
        '--mount','type=bind,src='+fixtures+',dst=/fixtures,readonly',...mounts,
        '--entrypoint','/bin/sh',row.artifact,...args],binary?{encoding:null}:{});
    } finally {
      // Only this adapter's uniquely named disposable container, including timeout cleanup.
      try { execute('docker',['rm','-f',name]); } catch {}
    }
  };
  for(const row of input.targets) {
    const item={artifact:row.artifact,roles:row.roles,passed:false}; results.push(item);
    try {
      let bytes;
      if(row.artifact==='host-dpkg') {
        assert.equal(execute('dpkg-query',['-W','-f=${Version}','libacl1']).trim(),row.version);
        bytes=fs.readFileSync(row.libraryPath);
      } else {
        assert.equal(execute('docker',['image','inspect','--format','{{.Id}} {{.Architecture}} {{.Os}}',row.artifact]).trim(),row.artifact+' amd64 linux');
        bytes=isolated(row,['-c','cat "$1"','read-library',row.libraryPath],[],true);
      }
      assert.equal(sha(bytes),row.librarySha256);
      const old=output+'/old-'+row.librarySha256+'.so'; fs.writeFileSync(old,bytes,{mode:0o600});
      const symbols=exportsOf(old); for(const symbol of symbols)assert(candidateExports.has(symbol),symbol);
      item.preservedExports=symbols.length;
      if(row.artifact==='host-dpkg') {
        item.scope='static-payload-and-export-check-only'; item.passed=true;
      } else {
        item.scope='isolated-ordinary-compatibility';
        for(const mode of ['baseline','candidate']) {
          const mounts=mode==='candidate'?['--mount','type=bind,src='+candidate+',dst='+row.libraryPath+',readonly']:[];
          const stdout=isolated(row,['-ec',ordinary,'ordinary-acl',row.version,row.libraryPath,
            mode==='candidate'?input.candidateLibrarySha256:row.librarySha256,String(row.rsyncExpected),mode],mounts);
          assert(stdout.trim().endsWith('ordinary-acl-copy-archive-rename-pass'));
          item[mode]={passed:true,stdoutSha256:sha(Buffer.from(stdout))};
        }
        item.rsyncChecked=row.rsyncExpected; item.passed=true;
      }
    } catch(error) {
      // Private, bounded diagnostics; continue independent images but preserve failure.
      item.error=String(error.message).slice(0,8192);
    }
    fs.writeFileSync(output+'/progress.json',JSON.stringify(results,null,2)+'\n');
  }
  const report={schemaVersion:1,date:new Date().toISOString(),manifestSha256:sha(fs.readFileSync(manifest)),
    adapterSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),fixtureSha256:sha(Buffer.from(ordinary)),
    candidateLibrarySha256:input.candidateLibrarySha256,results,passed:results.every(x=>x.passed),
    productionChanged:false,vulnerabilityReproductionPerformed:false,securityClosureAllowed:false,
    limitations:['Library compatibility is not a caller migration or complete vulnerability repair.',
      'Host execution, Trixie-native packaging and full application workflows are not verified here.']};
  fs.writeFileSync(output+'/result.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,targets:results.length,failed:results.filter(x=>!x.passed).length,evidence:output+'/result.json'}));
  if(!report.passed) process.exitCode=1;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length,4,'Expected manifest and new private output directory');
  main(process.argv[2],process.argv[3]);
}
