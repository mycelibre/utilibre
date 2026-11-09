// Replay the reviewed local-only patch on one exact clean upstream revision.
import assert from 'node:assert/strict';
import cp from 'node:child_process';
const dir=process.argv[2];assert(dir?.startsWith('/var/lib/utilibre-maintenance/'));
const run=(...a)=>cp.execFileSync('git',a,{cwd:dir,encoding:'utf8'}).trim();
assert.equal(run('rev-parse','HEAD'),'ee95448d154cfdcf65264c45745f440c0480ef84');
assert.equal(run('status','--porcelain'),'');
const patch=new URL('../../toolbox/chartdb-local-source.patch',import.meta.url).pathname;
run('apply','--check',patch);run('apply',patch);
console.log('Exact ChartDB source and lock prepared; offline build and tests required.');
