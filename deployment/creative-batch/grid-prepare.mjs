import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const november11=process.argv[2]==='--nov11';
if(process.argv.length!==(november11?3:2))throw Error('Use --nov11 or no arguments');
const root=november11?'/var/lib/utilibre-maintenance/upgrade-closure-20261111/grid/source':'/opt/utilibre/evaluation-src/grid-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==(november11?'ff7692241c48c3495da0bb8eb7455f906f3abb2d':'d138275bbe9d4e4030d8cb8b2dcf66607da9295a'))throw Error('Unexpected source');
const get=p=>execFileSync('git',['show','HEAD:'+p],{cwd:root,encoding:'utf8'}),put=(p,s)=>writeFileSync(root+'/'+p,s);
put('src/kiri/app/stats.js',`// Utilibre: native API retained; no usage counters, identifiers or reporting.
class Stats {get() {return undefined;} save(){return this;} set(){return this;} add(){return this;} del(){return this;}}
export const stats = new Stats(); export {stats as Stats};\n`);
const input=get('src/kiri/app/init/input.js');
if(input.split("sdb.setItem('kiri-init', inits);").length!==2)throw Error('Visit counter precondition changed');
put('src/kiri/app/init/input.js',input.replace("sdb.setItem('kiri-init', inits);",'// No persisted visit counter.'));
console.log('GridSpace usage reporting disabled; static build only, no machine-control server.');
