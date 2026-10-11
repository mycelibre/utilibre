// Pure freshness/result checks reused by alerts and tests. No visitor metadata.
export function reportIssues(name,report,hours,now=Date.now()){
 const issues=[],date=Date.parse(report?.completedAt||report?.date);
 if(!Number.isFinite(date)||date>now+300000||now-date>hours*3600000)issues.push(`${name}: missing/stale/invalid report`);
 if(!(name==='Weekly maintenance digest'?['relay-accepted']:['checked','passed']).includes(report?.status))issues.push(`${name}: failed or incomplete`);
 if(Array.isArray(report?.results))for(const r of report.results)if(r.status!=='passed')issues.push(`${name}: ${r.id} failed`);
 if(name==='Vulnerability scan'){
  if(!report?.images?.length||report.images.length!==report.expectedImages||report.images.some(x=>x.status!=='checked')||!report.host?.packages)issues.push('Vulnerability scan: runtime/OS coverage incomplete');
 }
 return issues;
}
export function queueIssues(queue,scan,now=Date.now()){
 if(!queue||!Array.isArray(queue.items)||queue.scanDate!==(scan.completedAt||scan.date)||queue.status!=='current')return ['Security triage queue is missing, stale or incomplete'];
 const pending=queue.items.filter(x=>!(['mitigated','not-affected'].includes(x.status)&&Date.parse(x.decision?.expiresAt)>now));
 const critical=pending.filter(x=>x.severity==='CRITICAL').length,high=pending.filter(x=>x.severity==='HIGH').length;
 const overdue=pending.filter(x=>Date.parse(x.reviewBy)<now).length;
 const issues=[];
 if(critical||high)issues.push(`Security review queue: ${critical} critical / ${high} high package-target findings; review required, not proof of exploitability`);
 if(overdue)issues.push(`Security review queue: ${overdue} findings past their triage target`);
 return issues;
}
export function externalIssues(workflow,runs,now=Date.now()){
 if(workflow?.state!=='active')return ['Independent external monitoring workflow is disabled or unavailable'];
 // Explicit notification drills aren't availability evidence.
 const latest=runs?.workflow_runs?.find(r=>r.status==='completed'&&!/alert drill/i.test(r.display_title||''));
 if(!latest||!Number.isFinite(Date.parse(latest.updated_at))||now-Date.parse(latest.updated_at)>90*60000||Date.parse(latest.updated_at)>now+300000)return ['Independent external monitoring has no recent completed run (90 minutes)'];
 return latest.conclusion==='success'?[]:['Independent external monitoring failed; inspect GitHub Actions'];
}
export function alertState(previous,issues,now=Date.now()){
 // Count each stable issue independently: a flapping neighbor must not starve it.
 const observed={};for(const issue of issues)observed[issue]=(previous.observed?.[issue]||0)+1;
 const confirmed=Object.keys(observed).filter(k=>observed[k]>=2).sort();
 const fingerprint=JSON.stringify(confirmed);
 return {observed,fingerprint,due:confirmed.length>0&&(previous.alertedFingerprint!==fingerprint||now-(previous.sentAt||0)>12*3600000),recovered:issues.length===0&&Boolean(previous.alertedFingerprint),confirmed};
}
