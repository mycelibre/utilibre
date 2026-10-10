// Test-container-only tripwires. Never mount this startup in production.
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
const file='/app/apps/server/dist/service-SaYX5hQK.mjs';
let source=await readFile(file,'utf8');
const old='async function shouldCountView(key, now) {';
assert.equal(source.split(old).length,2);
source=source.replace(old,old+'\n throw new Error("Utilibre verification: visitor deduplication must never execute");');
// Catch analytics-specific key construction before it reaches the dedup map.
const key='if (await shouldCountView(`${resume$1.id}:${getClientKey(input.trustedClient)}`, Date.now()))';
assert.equal(source.split(key).length,2);
source=source.replace(key,'throw new Error("Utilibre verification: visitor identifier must never be derived");\n'+key);
await writeFile(file,source);
const {main}=await import('/app/apps/server/dist/index.mjs');
await main();
