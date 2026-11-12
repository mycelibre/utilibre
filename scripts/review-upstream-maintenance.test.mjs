import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repository,reviewedRef,recentAdvisories,partitionReviewed,runtimeEvidenceFormat,releaseComparison,selectStableRelease,parseRuntimeVersion} from './review-upstream-maintenance.mjs';
import {creativeProviders} from '../portal/src/catalog/creative-providers.ts';
test('runtime advisory evidence requests no environment, credentials or mount data',()=>{
 assert.deepEqual([...runtimeEvidenceFormat.matchAll(/\{\{json ([^}]+)\}\}/g)].map(m=>m[1]),['.Name','.Image','.State.Running']);
});
test('host release line ignores newer majors, prereleases and unordered provider data',()=>{
 const rows=['v26.1.0','v24.9.1','v24.22.3','v24.23.0-rc1','v24.14.0'].map(tag_name=>({tag_name}));
 assert.equal(selectStableRelease(rows,'24.').tag_name,'v24.22.3');
 assert.equal(selectStableRelease([{tag_name:'v3.13.18'},{tag_name:'v3.15.1'}],'3.13.').tag_name,'v3.13.18');
 assert.equal(selectStableRelease(rows,'23.'),undefined);
 assert.throws(()=>selectStableRelease(rows,'24.*'));
 assert.equal(selectStableRelease([{tag_name:'v24.30.0',draft:true},...rows],'24.').tag_name,'v24.22.3');
});
test('runtime reports inspect executable versions without accepting arbitrary output',()=>{
 for(const [output,expected] of [['gh version 2.103.3+utilibre1 (2026-11-12)','2.103.3'],['v24.22.3\n','24.22.3'],['Python 3.13.18','3.13.18'],['restic 0.19.1+utilibre1 compiled with go1.27.3','0.19.1'],['Version: 0.76.2\nDB information','0.76.2']])assert.equal(parseRuntimeVersion(output),expected);
 for(const output of ['error 3.13.18','v24.22.3rc1',''])assert.throws(()=>parseRuntimeVersion(output));
});
test('review source URLs without accepting credentials or query injection',()=>{
 assert.equal(repository('https://github.com/gristlabs/grist-core').clone,'https://github.com/gristlabs/grist-core.git');
 for(const u of ['http://github.com/a/b','https://x:y@github.com/a/b','https://github.com/a/b?x=y','https://github.com/a/b/extra'])assert.throws(()=>repository(u));
});
test('pinned source refs cover GitHub, GitLab and Forgejo',()=>{
 for(const u of ['https://github.com/a/b/tree/abcd','https://gitlab.com/a/b/-/tree/abcd','https://codeberg.org/a/b/src/commit/abcd'])assert.equal(reviewedRef(u),'abcd');
});
test('advisory review excludes older and withdrawn notices, not unknown security coverage',()=>{
 const rows=[{ghsa_id:'old',published_at:'2026-10-01'},{ghsa_id:'new',published_at:'2026-10-12',severity:'high'},{ghsa_id:'withdrawn',published_at:'2026-10-12',withdrawn_at:'2026-10-13'}];
 assert.deepEqual(recentAdvisories(rows,'2026-10-11').map(a=>a.id),['new']);
});
test('an older advisory updated after the review remains visible',()=>{
 assert.equal(recentAdvisories([{ghsa_id:'changed',published_at:'2020-01-01',updated_at:'2026-10-12'}],'2026-10-11')[0].id,'changed');
});
test('all-history baseline retains old advisories until an explicit runtime-bound review',()=>{
 const history=recentAdvisories([{ghsa_id:'old',published_at:'2020-01-01',updated_at:'2020-01-02'}],'1970-01-01');
 assert.equal(partitionReviewed(history,null,[]).needsReview[0].id,'old');
});
test('reviewed advisory reopens on changed runtime, advisory revision or range',()=>{
 const advisory={id:'GHSA-test',updated:'2026-10-05',affected:[{range:'<2.18.0'}]};
 const review={version:'2.18.2',containers:{'/test':'exact-image'},advisories:[{...advisory,reason:'Reviewed fixed release'}]};
 const live=[{Name:'/test',Image:'exact-image',State:{Running:true}}];
 assert.equal(partitionReviewed([advisory],review,live).reviewed.length,1);
 for(const changed of [[],[{...live[0],Image:'different'}],[{...live[0],State:{Running:false}}]])assert.equal(partitionReviewed([advisory],review,changed).needsReview.length,1);
 for(const changed of [{...advisory,updated:'2026-10-06'},{...advisory,affected:[{range:'<2.19.0'}]}])assert.equal(partitionReviewed([changed],review,live).needsReview.length,1);
});
test('every deployed creative addition is included by canonical metadata; holds remain excluded',()=>{
 const deployed=Object.entries(creativeProviders).filter(([,p])=>p.reviewStatus==='deployed');
 assert.equal(deployed.length,11);for(const [,p]of deployed){assert(repository(p.sourceUrl));assert.match(reviewedRef(p.reviewedSourceUrl),/^[a-f0-9]{40}$/);}
 assert.equal(creativeProviders.microstudio.reviewStatus,'staged');assert.equal(creativeProviders.graphite.reviewStatus,'staged');
});
test('host and mounted-code reviews require exact file bytes, not empty container evidence',()=>{
 const a={id:'one',updated:'today',affected:[]};
 const review={version:'2.102.0',containers:{},files:{'/usr/bin/gh':'sha256'},advisories:[a]};
 assert.equal(partitionReviewed([a],{...review,files:{}},[]).needsReview.length,1);
 assert.equal(partitionReviewed([a],review,[],{'/usr/bin/gh':'other'}).needsReview.length,1);
 assert.equal(partitionReviewed([a],review,[],{'/usr/bin/gh':'sha256'}).reviewed.length,1);
});
test('a deployment mitigation is not misreported as a patched application',()=>{
 const a={id:'one',updated:'today',affected:[]};
 const review={containers:{'/test':'image'},advisories:[{...a,disposition:'deployment-mitigated'}]};
 const result=partitionReviewed([a],review,[{Name:'/test',Image:'image',State:{Running:true}}]);
 assert.equal(result.reviewed[0].disposition,'deployment-mitigated');
});

test('release comparison rejects ambiguity and never recommends a downgrade',()=>{
 assert.equal(releaseComparison('2.1.0','v2.1.1'),'newer-release');
 assert.equal(releaseComparison('2.1.1','2.1.1'),'same-version');
 assert.equal(releaseComparison('2.9.0','2.18.0'),'newer-release');
 assert.equal(releaseComparison('1.1.0','v0.3.0'),'catalogue-ahead');
 assert.equal(releaseComparison('2.8.8-p4 · local runtimes','v2.8.11'),'newer-release');
 assert.equal(releaseComparison('2026.8.3-python-security-20261011','version/2026.8.5'),'newer-release');
 assert.equal(releaseComparison('1.1.0-p1','v0.3.0'),'catalogue-ahead');
 for(const value of ['main','1.0.0-rc1','abc123','1.0.0-custom'])assert.equal(releaseComparison(value,'1.0.1'),'unverified');
});
