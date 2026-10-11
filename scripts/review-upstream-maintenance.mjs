// Read-only maintenance inventory from the existing catalogue. No app upgrades,
// visitor requests, dependency installs, source execution or database access.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {reviewedFossProviders} from '../portal/src/catalog/upstreams.ts';
const exec=promisify(execFile);
const advisoryReviews=JSON.parse(readFileSync(new URL('../deployment/maintenance/advisory-reviews.json',import.meta.url),'utf8'));
export function partitionReviewed(advisories,review,live){
 const needsReview=[],reviewed=[];
 // Exact runtime identities and advisory revision/range must all still match.
 // Missing access, stopped containers, a new image or edited advisory reopens it.
 const matches=review&&Object.entries(review.containers).every(([name,image])=>live.some(x=>x.Name===name&&x.Image===image&&x.State?.Running===true));
 for(const advisory of advisories){
  const decision=matches&&review.advisories.find(x=>x.id===advisory.id&&x.updated===advisory.updated&&JSON.stringify(x.affected)===JSON.stringify(advisory.affected));
  if(decision)reviewed.push({...advisory,disposition:'not-affected-at-reviewed-version',version:review.version,reviewedAt:review.reviewedAt,reason:decision.reason,evidence:decision.source});
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
async function gh(path){
 const {stdout}=await exec('gh',['api','--hostname','github.com',path],{timeout:25000,maxBuffer:4*1024**2});return JSON.parse(stdout);
}
export async function inspectProvider(id,p){
 if(id==='searxng'){
  try{
   const live=JSON.parse(readFileSync('/opt/utilibre/update-public/searxng.json','utf8'));
   if(!/^[a-f0-9]{40}$/.test(live.revision)||typeof live.version!=='string')throw Error('Invalid deployment record');
   p={...p,installedVersion:live.version,reviewedSourceUrl:'https://github.com/searxng/searxng/tree/'+live.revision};
  }catch{/* Retain the catalogue reference; it is not a runtime assertion. */}
 }
 const result={id,project:p.project,installed:p.installedVersion,source:p.reviewedSourceUrl,reviewedOn:p.reviewedOn,runbook:p.reviewDocument,mode:id==='searxng'?'existing-guarded-updater':'review-before-update'};
 try{
  const r=repository(p.sourceUrl),ref=reviewedRef(p.reviewedSourceUrl);
  if(r.host==='github.com'){
   const base='repos'+r.path;
   const releases=await gh(base+'/releases?per_page=10');
   const latest=releases.find(x=>!x.prerelease&&!x.draft);
   result.release=latest?{tag:latest.tag_name,url:latest.html_url,published:latest.published_at}:null;
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
    let live=[];const review=advisoryReviews[id];
    if(review)try{
     const {stdout}=await exec('docker',['inspect',...Object.keys(review.containers).map(x=>x.slice(1))],{timeout:10000,maxBuffer:1024**2});
     live=JSON.parse(stdout); // Never persist environment, labels, mounts or secrets.
    }catch{/* No runtime evidence: retain every review alert. */}
    result.advisories={coverage:complete?'repository-published':'partial-300-limit',examined:all.length,...partitionReviewed(recentAdvisories(all,p.reviewedOn),review,live),publishedHistory:recentAdvisories(all,'1970-01-01')};
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
 if(only&&!Object.hasOwn(reviewedFossProviders,only))throw Error('Unknown provider');
 const selected=Object.entries(reviewedFossProviders).filter(([id,p])=>p.reviewStatus==='deployed'&&(!only||id===only));
 const results=new Array(selected.length);let next=0;
 await Promise.all(Array.from({length:3},async()=>{while(next<selected.length){const i=next++;results[i]=await inspectProvider(...selected[i]);}}));
 const report={date:new Date().toISOString(),scope:only||'deployed-catalogue',providers:results.length,results,
 note:'A changed default branch is a review candidate, not a safe upgrade or proof of an overdue release. No advisories returned is not a security clearance. Dependency vulnerabilities require the release-specific lockfile/image review. No application changed.'};
 const dir='/var/lib/utilibre-maintenance';mkdirSync(dir,{recursive:true,mode:0o700});
 const name=only?'provider-'+only:'latest';
 writeFileSync(dir+'/'+name+'.tmp',JSON.stringify(report,null,2)+'\n',{mode:0o600});renameSync(dir+'/'+name+'.tmp',dir+'/'+name+'.json');
 console.log(JSON.stringify({providers:results.length,unavailable:results.filter(x=>x.status!=='checked').map(x=>x.id),advisoryReview:results.filter(x=>x.advisories?.needsReview?.length).map(x=>x.id),report:dir+'/'+name+'.json'}));
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
