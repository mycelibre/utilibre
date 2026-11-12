// Read-only maintenance inventory from the existing catalogue. No app upgrades,
// visitor requests, dependency installs, source execution or database access.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {reviewedFossProviders} from '../portal/src/catalog/upstreams.ts';
const exec=promisify(execFile);
export const runtimeEvidenceFormat='{"Name":{{json .Name}},"Image":{{json .Image}},"State":{"Running":{{json .State.Running}}}}';
const advisoryReviews=JSON.parse(readFileSync(new URL('../deployment/maintenance/advisory-reviews.json',import.meta.url),'utf8'));
const operationalProviders=JSON.parse(readFileSync(new URL('../deployment/maintenance/operational-providers.json',import.meta.url),'utf8'));
export function partitionReviewed(advisories,review,live,files={}){
 const needsReview=[],reviewed=[];
 // Exact runtime identities and advisory revision/range must all still match.
 // Missing access, stopped containers, a new image or edited advisory reopens it.
 const matches=review&&(Object.keys(review.containers||{}).length+Object.keys(review.files||{}).length>0)
  &&Object.entries(review.containers||{}).every(([name,image])=>live.some(x=>x.Name===name&&x.Image===image&&x.State?.Running===true))
  &&Object.entries(review.files||{}).every(([name,hash])=>files[name]===hash);
 for(const advisory of advisories){
  const decision=matches&&review.advisories.find(x=>x.id===advisory.id&&x.updated===advisory.updated&&JSON.stringify(x.affected)===JSON.stringify(advisory.affected));
  if(decision)reviewed.push({...advisory,disposition:decision.disposition||'not-affected-at-reviewed-version',version:review.version,reviewedAt:review.reviewedAt,reason:decision.reason,evidence:decision.source});
  else needsReview.push(advisory);
 }
 return {needsReview,reviewed};
}
export function repository(source){
 const u=new URL(source);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)throw Error('Invalid source origin');
 const path=u.pathname.replace(/\/$/,'').replace(/\.git$/,'');
 if(!/^\/[\w.-]+\/[\w.-]+$/.test(path))throw Error('Review repository path');
 return {host:u.hostname,path,clone:u.origin+path+'.git'};
}
export function reviewedRef(url){
 const u=new URL(url);return decodeURIComponent(u.pathname.split(/\/(?:-\/)?tree\/|\/src\/(?:commit|tag|branch)\//)[1]||'');
}
export function recentAdvisories(rows,date){
 const since=Date.parse(date+'T00:00:00Z');
 return rows.filter(a=>a.published_at&&(Date.parse(a.published_at)>since||Date.parse(a.updated_at)>since)&&!a.withdrawn_at)
 .map(a=>({id:a.ghsa_id,severity:a.severity,url:a.html_url,published:a.published_at,
 updated:a.updated_at||a.published_at,
 affected:(a.vulnerabilities||[]).map(v=>({package:v.package?.name,range:v.vulnerable_version_range,patched:v.patched_versions}))}));
}
// Compare only explicit stable numeric versions. Branches, commits and custom
// version strings require inspection; a different tag is not a newer release.
export function releaseComparison(installed,tag){
 const recorded=typeof installed==='string'?installed.match(/^v?(\d+\.\d+(?:\.\d+)?)(?:-p\d+|-python-security-\d{8})?(?:$| · | \+ )/):null;
 const published=typeof tag==='string'?tag.match(/^(?:[vV]\.?|version\/)?(\d+\.\d+(?:\.\d+)?)$/):null;
 const a=recorded?.[1].split('.').map(Number),b=published?.[1].split('.').map(Number);if(!a||!b)return 'unverified';
 for(let i=0;i<3;i++){if((b[i]||0)>(a[i]||0))return 'newer-release';if((b[i]||0)<(a[i]||0))return 'catalogue-ahead';}
 return 'same-version';
}
export function selectStableRelease(rows,line){
 if(line!==undefined&&!/^\d+(?:\.\d+)?\.$/.test(line))throw Error('Invalid release line');
 return rows.filter(x=>!x.prerelease&&!x.draft&&/^v?\d+\.\d+\.\d+$/.test(x.tag_name)&&(!line||x.tag_name.replace(/^v/,'').startsWith(line)))
  .sort((a,b)=>a.tag_name.replace(/^v/,'').localeCompare(b.tag_name.replace(/^v/,''),undefined,{numeric:true})).at(-1);
}
export function parseRuntimeVersion(output){
 const value=output.trim().split('\n')[0].match(/^(?:v|Python |restic |Version: |gh version )(\d+\.\d+\.\d+)(?:\+utilibre\d+)?(?:\s|$)/)?.[1];
 if(!value)throw Error('Unrecognized host runtime version');return value;
}
const hostCommands={
 'github-cli-host':['/usr/bin/gh',['--version']],
 'node-host':['/root/.nvm/versions/node/v24.22.3/bin/node',['--version']],
 'python-host':['/usr/bin/python3.13',['--version']],
 'trivy-host':['/opt/utilibre/maintenance/bin/trivy',['--version']],
 'restic-host':['/opt/utilibre/maintenance/bin/restic',['version']],
};
async function gh(path){
 const {stdout}=await exec('gh',['api','--hostname','github.com',path],{timeout:25000,maxBuffer:4*1024**2,env:{...process.env,GH_TELEMETRY:'disabled'}});return JSON.parse(stdout);
}
export async function inspectProvider(id,p){
 if(id==='searxng'||id==='privatebin'){
  try{
   const live=JSON.parse(readFileSync('/opt/utilibre/update-public/'+id+'.json','utf8'));
   if(!/^[a-f0-9]{40}$/.test(live.revision)||typeof live.version!=='string')throw Error('Invalid deployment record');
   p={...p,installedVersion:live.version,reviewedSourceUrl:(id==='searxng'?'https://github.com/searxng/searxng/tree/':'https://github.com/PrivateBin/PrivateBin/tree/')+live.revision};
  }catch{/* Retain the catalogue reference; it is not a runtime assertion. */}
 }
 const result={id,project:p.project,installed:p.installedVersion,source:p.reviewedSourceUrl,reviewedOn:p.reviewedOn,runbook:p.reviewDocument,mode:id==='searxng'?'existing-guarded-updater':id==='redlib'?'guarded-reviewed-artifact-updater':id==='privatebin'?'guarded-stable-patch-updater':'review-before-update'};
 try{
  if(Object.hasOwn(hostCommands,id)){
   const [program,args]=hostCommands[id];
   const {stdout}=await exec(program,args,{timeout:10000,maxBuffer:16384,env:{PATH:'/usr/bin:/bin',GH_TELEMETRY:'disabled',TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true'}});
   result.installed=parseRuntimeVersion(stdout);result.runtimeEvidence={path:program,sha256:createHash('sha256').update(readFileSync(program)).digest('hex')};
   if(id==='github-cli-host'){
    const {stdout:telemetry}=await exec(program,['config','get','telemetry'],{timeout:10000,maxBuffer:1024,env:{PATH:'/usr/bin:/bin',HOME:'/root',GH_TELEMETRY:'disabled'}});
    if(telemetry.trim()!=='disabled')throw Error('Host CLI telemetry configuration does not satisfy the disabled policy');
    result.privacy={usageTelemetry:'disabled',environmentOverride:'disabled'};
   }
  }
  const r=repository(p.sourceUrl),ref=reviewedRef(p.reviewedSourceUrl);
  if(r.host==='github.com'){
   const base='repos'+r.path;
   const releases=await gh(base+'/releases?per_page='+(p.releaseLine?'100':'10'));
   let latest=p.releaseLine?selectStableRelease(releases,p.releaseLine):releases.find(x=>!x.prerelease&&!x.draft);
   if(p.releaseSource==='git-tags'){
    if(!/^\d+\.\d+\.$/.test(p.releaseLine||''))throw Error('Invalid tag release line');
    const {stdout}=await exec('git',['ls-remote','--tags','--refs',r.clone,'refs/tags/v'+p.releaseLine+'*'],{timeout:25000,maxBuffer:65536,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
    latest=selectStableRelease(stdout.trim().split('\n').map(row=>({tag_name:row.split('\t')[1]?.replace('refs/tags/','')})),p.releaseLine);
    if(latest)latest={...latest,html_url:p.sourceUrl+'/releases/tag/'+latest.tag_name,published_at:null};
    result.releaseEvidence='Stable upstream Git tags; publication date unavailable';
   }
   result.release=latest?{tag:latest.tag_name,url:latest.html_url,published:latest.published_at}:null;
   result.releaseComparison=latest?releaseComparison(result.installed,latest.tag_name):'no-stable-release';
   if(p.releaseLine){result.releaseLine=p.releaseLine;if(!latest)throw Error('No supported-line release found');}
   const commits=await gh(base+'/commits?per_page=1');
   result.defaultBranchHead=commits[0]?.sha||null;
   result.branchChanged=/^[a-f0-9]{40}$/i.test(ref)?ref!==result.defaultBranchHead:null;
   // Published repository advisories only, not private drafts or dependency SBOM analysis.
   const all=[];let complete=false;
   try{
    for(let page=1;page<=3;page++){
     const rows=await gh(base+`/security-advisories?state=published&per_page=100&page=${page}`);
     if(!Array.isArray(rows))throw Error('Invalid advisory response');all.push(...rows);
     if(rows.length<100){complete=true;break;}
    }
    let live=[],files={};const review=advisoryReviews[id];
    if(review)try{
     const names=Object.keys(review.containers||{});
     if(names.length){const {stdout}=await exec('docker',['inspect','--format',runtimeEvidenceFormat,...names.map(x=>x.slice(1))],{timeout:10000,maxBuffer:1024**2});live=stdout.trim().split('\n').map(line=>JSON.parse(line));}
     // Reviewed host executables or mounted code only; never persist their bytes.
     for(const file of Object.keys(review.files||{}))files[file]=createHash('sha256').update(readFileSync(file)).digest('hex');
    }catch{/* No runtime evidence: retain every review alert. */}
    // A catalogue content-review date is not an advisory disposition. Older
    // notices require the same exact-version evidence as newly edited notices.
    const history=recentAdvisories(all,'1970-01-01');
    result.advisories={coverage:complete?'repository-published':'partial-300-limit',examined:all.length,...partitionReviewed(history,review,live,files),publishedHistory:history};
   }catch{result.advisories={coverage:'unavailable',needsReview:[]};}
  }else{
   const {stdout}=await exec('git',['ls-remote',r.clone,'HEAD'],{timeout:25000,maxBuffer:4096,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
   const head=stdout.match(/^([a-f0-9]{40})\s+HEAD/m)?.[1];if(!head)throw Error('Missing upstream head');
   result.defaultBranchHead=head;result.branchChanged=/^[a-f0-9]{40}$/i.test(ref)?head!==ref:null;
   result.advisories={coverage:'manual-primary-source-review',needsReview:[]};
  }
  result.status='checked';
 }catch{result.status='unavailable';result.note='Upstream lookup failed; not evidence that the installed version is current.';}
 return result;
}
export async function run(args=process.argv.slice(2)){
 if(args.some(a=>!a.startsWith('--only=')))throw Error('Supported option: --only=provider-id');
 const only=args.find(a=>a.startsWith('--only='))?.slice(7);
 const providers={...reviewedFossProviders,...operationalProviders};
 if(only&&!Object.hasOwn(providers,only))throw Error('Unknown provider');
 const selected=Object.entries(providers).filter(([id,p])=>p.reviewStatus==='deployed'&&(!only||id===only));
 const results=new Array(selected.length);let next=0;
 await Promise.all(Array.from({length:3},async()=>{while(next<selected.length){const i=next++;results[i]=await inspectProvider(...selected[i]);}}));
 const updateCandidates=results.filter(r=>r.releaseComparison==='newer-release').map(r=>({id:r.id,project:r.project,recordedVersion:r.installed,release:r.release,mode:r.mode,evidence:'Comparison with recorded version; verify current runtime and retained repairs before approval.'}));
 const report={date:new Date().toISOString(),scope:only||'deployed-catalogue-and-reviewed-companions',providers:results.length,updateCandidates,results,
 note:'A changed default branch is a review candidate, not a safe upgrade or proof of an overdue release. No advisories returned is not a security clearance. Dependency vulnerabilities require the release-specific lockfile/image review. No application changed.'};
 const dir='/var/lib/utilibre-maintenance';mkdirSync(dir,{recursive:true,mode:0o700});
 const name=only?'provider-'+only:'latest';
 writeFileSync(dir+'/'+name+'.tmp',JSON.stringify(report,null,2)+'\n',{mode:0o600});renameSync(dir+'/'+name+'.tmp',dir+'/'+name+'.json');
 console.log(JSON.stringify({providers:results.length,unavailable:results.filter(x=>x.status!=='checked').map(x=>x.id),advisoryReview:results.filter(x=>x.advisories?.needsReview?.length).map(x=>x.id),report:dir+'/'+name+'.json'}));
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
