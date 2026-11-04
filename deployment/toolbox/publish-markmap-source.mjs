// Exact upstream source plus this integration, never runtime data or secrets.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, cpSync, copyFileSync, writeFileSync, renameSync, existsSync, chmodSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./', import.meta.url));
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--nov4'));
const november=process.argv[2]==='--nov4',evidence='/var/lib/utilibre-maintenance/security-20261103/markmap';
const sha=b=>createHash('sha256').update(b).digest('hex');
let candidate;
if(november){
  candidate=JSON.parse(readFileSync(evidence+'/build.json'));
  for(const name of ['native','dependencies','markmap-verify']){const r=JSON.parse(readFileSync(evidence+'/'+name+'.json'));assert(r.passed&&r.imageId===candidate.imageId);}
  assert(!existsSync('/opt/utilibre/toolbox-public/markmap-parser-20261104-source.tar.gz'),'Preserve immutable source offer');
}
const revision = '205367a24603dc187f67da1658940c6cade20dce'; // npm 0.18.12 gitHead
const stage = mkdtempSync('/opt/utilibre/markmap-source-');
execFileSync('git', ['archive', '--format=tar', '--prefix=markmap/', '--output', `${stage}/upstream.tar`, revision], { cwd: '/opt/utilibre/src/markmap' });
execFileSync('tar', ['-xf', `${stage}/upstream.tar`, '-C', stage]);
const integration = `${stage}/markmap/utilibre`;
mkdirSync(integration);
cpSync(root + 'markmap', `${integration}/markmap`, { recursive: true, filter: source => !/(?:^|\/)(?:node_modules|dist|test-results)(?:\/|$)/.test(source) });
if(november){
  const build=JSON.parse(readFileSync(evidence+'/client-build.json'));
  for(const [file,hash]of [['package.json',build.packageSha256],['package-lock.json',build.lockSha256]]){assert.equal(sha(readFileSync(evidence+'/'+file)),hash);copyFileSync(evidence+'/'+file,`${integration}/markmap/${file}`);}
  mkdirSync(`${integration}/reviewed-dependencies`);
  for(const p of JSON.parse(readFileSync(evidence+'/dependency-inputs.json')).filter(p=>p.state==='candidate')){assert.equal(sha(readFileSync(evidence+'/dependencies/'+p.file)),p.sha256);copyFileSync(evidence+'/dependencies/'+p.file,`${integration}/reviewed-dependencies/${p.file}`);}
}
for (const name of ['Dockerfile.markmap', 'security-markmap.conf', 'nginx-browser.conf', 'compose.browser.yaml', 'check-markmap.mjs', 'publish-markmap-source.mjs']) copyFileSync(root + name, `${integration}/${name}`);
copyFileSync(root + '../../LICENSE', `${integration}/LICENSE`);
copyFileSync(root + '../../docs/licenses.md', `${integration}/LICENSE_DETAILS.md`);
mkdirSync(`${integration}/branding/svg`, { recursive: true });
copyFileSync(root + '../../portal/public/brand/svg/utilibre-logo-coral.svg', `${integration}/branding/svg/utilibre-logo-coral.svg`);
copyFileSync(root + '../../portal/public/brand/README.txt', `${integration}/branding/README.txt`);
writeFileSync(`${integration}/BUILD.txt`, 'Utilibre integration is AGPL-3.0-or-later; upstream Markmap remains MIT. npm 0.18.12 source gitHead: ' + revision + '. Use npm ci --ignore-scripts && npm run build in utilibre/markmap, or Dockerfile.markmap with markmap as context. Lockfile pins all npm dependencies. No runtime secrets are needed. Public assets and dependency license notices are in dist/. Serve using the included nginx and CSP configuration. Keep remote images, plugins and frontmatter asset loading disabled.\n');
const destination = '/opt/utilibre/toolbox-public/markmap-utilibre.tar.gz';
execFileSync('tar', ['-czf', `${stage}/markmap-utilibre.tar.gz`, '-C', stage, 'markmap']);
if (existsSync(destination)) copyFileSync(destination, `${stage}/previous.tar.gz`);
renameSync(`${stage}/markmap-utilibre.tar.gz`, destination);
chmodSync(destination,0o644);
if(november){
  const name='markmap-parser-20261104-source.tar.gz',bytes=readFileSync(destination);
  copyFileSync(destination,'/opt/utilibre/toolbox-public/'+name);chmodSync('/opt/utilibre/toolbox-public/'+name,0o644);
  const fetched=execFileSync('curl',['-fsS','--max-time','20','https://mindmap.utilibre.org/utilibre-source/'+name],{timeout:25000,maxBuffer:8*1024**2});assert.equal(sha(fetched),sha(bytes));
  writeFileSync(evidence+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),published:true,publicHashVerified:true,imageId:candidate.imageId,filename:name,sha256:sha(bytes),bytes:bytes.length,previousArchive:stage+'/previous.tar.gz'},null,2)+'\n',{mode:0o600});
}
console.log(`Published ${destination}; source ${revision}; previous artifact retained in ${stage}`);
