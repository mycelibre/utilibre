import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root='/opt/utilibre/evaluation-src/grid-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!=='d138275bbe9d4e4030d8cb8b2dcf66607da9295a')throw Error('Unexpected source');
const get=p=>execFileSync('git',['show','HEAD:'+p],{cwd:root,encoding:'utf8'}),put=(p,s)=>writeFileSync(root+'/'+p,s);
put('src/kiri/app/stats.js',`// Utilibre: native API retained; no usage counters, identifiers or reporting.
class Stats {get() {return undefined;} save(){return this;} set(){return this;} add(){return this;} del(){return this;}}
export const stats = new Stats(); export {stats as Stats};\n`);
put('src/kiri/app/init/input.js',get('src/kiri/app/init/input.js').replace("sdb.setItem('kiri-init', inits);",'// No persisted visit counter.'));
console.log('GridSpace usage reporting disabled; static build only, no machine-control server.');
