// Only disposable BuildKit records: never prune images, containers or volumes.
// Dry-run by default. Preserve recent builds and image-shared rollback layers.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, statfsSync} from 'node:fs';
import {disposableCache} from './cleanup-selection.mjs';

const apply = process.argv.includes('--apply');
const olderBuilds = process.argv.includes('--older-builds');
assert(process.argv.slice(2).every(arg => ['--apply', '--older-builds'].includes(arg)), 'Use --apply and/or --older-builds');
const docker = args => execFileSync('docker', args, {encoding:'utf8', timeout:120000, maxBuffer:8*1024*1024});
const free = () => { const s=statfsSync('/opt/utilibre'); return s.bavail*s.bsize; };
const ids = args => [...new Set(docker(args).trim().split('\n').filter(Boolean))].sort();
const bytes = value => {
  const match=value.match(/^([\d.]+)(B|kB|MB|GB|TB)$/);
  return match ? Number(match[1])*({B:1,kB:1e3,MB:1e6,GB:1e9,TB:1e12}[match[2]]) : 0;
};
const rows=docker(['buildx','du','--format','{{json .}}']).trim().split('\n').filter(Boolean).map(JSON.parse);
// The explicit older-builds batch also releases obsolete cached build graphs.
// Shared image layers stay referenced by retained images; no image prune runs.
// Keep recent builds, download/cache mounts, frontends and internal records.
const selected=rows.filter(r=>disposableCache(r,olderBuilds,bytes(r.Size)));
for(const row of selected) assert.match(row.ID,/^[a-z0-9]{20,32}$/);
const report={at:new Date().toISOString(),apply,freeBytesBefore:free(),
  scope:olderBuilds?'Exact selected reclaimable regular/source.local BuildKit records last used >=7 days; no images/containers/volumes or original source trees':'Unshared reclaimable regular BuildKit cache >=50 MiB, last used >=12 hours; no images/containers/volumes/snapshots',
  records:selected.map(({ID,Size,LastUsedAt,Type,Shared})=>({id:ID,size:Size,lastUsed:LastUsedAt,type:Type,shared:Shared})),
  estimatedBytes:selected.reduce((sum,r)=>sum+bytes(r.Size),0)};
console.log(JSON.stringify({apply,records:selected.length,estimatedGiB:report.estimatedBytes/1024**3,freeGiB:report.freeBytesBefore/1024**3}));
if(apply && selected.length) {
  const images=ids(['image','ls','-a','-q','--no-trunc']);
  const containers=ids(['ps','-a','-q','--no-trunc']);
  const output=docker(['buildx','prune','--force','--filter',olderBuilds?'until=168h':'until=12h',
    '--filter',`id~=^(${selected.map(r=>r.ID).join('|')})$`,
    ...(olderBuilds?['--min-free-space',String(30*1024**3)]:[])]);
  report.pruneSummary=output.trim().split('\n').filter(line=>/^Total:/.test(line));
  report.imagesPreserved=JSON.stringify(images)===JSON.stringify(ids(['image','ls','-a','-q','--no-trunc']));
  report.containersPreserved=JSON.stringify(containers)===JSON.stringify(ids(['ps','-a','-q','--no-trunc']));
  report.freeBytesAfter=free();
  const dir='/opt/utilibre/reports/disk-headroom-20261009';
  mkdirSync(dir,{recursive:true,mode:0o700});
  writeFileSync(`${dir}/${report.at.replace(/[:.]/g,'-')}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({freeGiBAfter:report.freeBytesAfter/1024**3,
    imagesPreserved:report.imagesPreserved,containersPreserved:report.containersPreserved,summary:report.pruneSummary}));
  assert(report.imagesPreserved && report.containersPreserved,'Resource inventory changed; inspect before further cleanup');
}
