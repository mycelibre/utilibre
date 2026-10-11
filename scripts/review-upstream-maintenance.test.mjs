import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repository,reviewedRef,recentAdvisories,partitionReviewed} from './review-upstream-maintenance.mjs';
import {creativeProviders} from '../portal/src/catalog/creative-providers.ts';
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
