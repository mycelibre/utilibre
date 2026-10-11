import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repository,reviewedRef,recentAdvisories} from './review-upstream-maintenance.mjs';
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
test('every deployed creative addition is included by canonical metadata; holds remain excluded',()=>{
 const deployed=Object.entries(creativeProviders).filter(([,p])=>p.reviewStatus==='deployed');
 assert.equal(deployed.length,11);for(const [,p]of deployed){assert(repository(p.sourceUrl));assert.match(reviewedRef(p.reviewedSourceUrl),/^[a-f0-9]{40}$/);}
 assert.equal(creativeProviders.microstudio.reviewStatus,'staged');assert.equal(creativeProviders.graphite.reviewStatus,'staged');
});
