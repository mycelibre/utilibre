import assert from 'node:assert/strict';
export function curlFixedUpstream(debianVersion){
 // Keep the prerelease marker: dpkg orders a stable release after its RCs.
 // Do not silently strip arbitrary suffixes or accept an unknown tracker value.
 // Preserve dated git snapshots as well: 8.12.0+git... is newer than 8.12.0,
 // not equivalent to it. Debian records the 2025-0725 fix in such a snapshot.
 const match=/^(?:\d+:)?(\d+\.\d+\.\d+(?:~rc\d+|\+git\d{8}\.[a-f0-9]{7,40}(?:\+ds\d*)?)?)-[A-Za-z0-9.+~]+$/.exec(debianVersion||'');
 assert(match,'Unsupported curl fixed-version spelling');
 return match[1];
}
export function curlSuites(log){
 const rows=[...log.matchAll(/TESTDONE:\s+(\d+) tests out of (\d+) reported OK/g)].map(m=>({passed:+m[1],reported:+m[2]}));
 assert.equal(rows.length,2,'Both native TLS suites required');
 assert(rows.every(x=>x.passed===x.reported&&x.passed>1000),'Both complete native suites must pass');
 assert(!/^TESTFAIL:/m.test(log),'Failed cases require diagnosis, not a summary-only pass');
 return rows;
}
export function allowedCurlFeatureChanges(before,after,release='8.22.0'){
 assert(['8.22.0','8.23.0'].includes(release),'Unreviewed curl release');
 const result=[];
 for(const label of ['Protocols','Features']){
  const get=t=>{const line=t.split('\n').find(l=>l.startsWith(label+':'));assert(line,'Missing native feature inventory');return line.slice(label.length+1).trim().split(/\s+/);};
  const current=get(after),removed=get(before).filter(x=>!current.includes(x));
  const retired=['rtmp','TLS-SRP',...(release==='8.23.0'&&label==='Protocols'?['smb','smbs']:[])];
  assert(removed.every(x=>retired.includes(x)),'Unexpected feature loss '+removed);
  result.push({label,removed});
 }
 return result;
}
