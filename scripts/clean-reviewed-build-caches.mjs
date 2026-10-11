// Explicit disposable build dependencies only. Never prune images or user data.
import {execFileSync} from 'node:child_process';
import {existsSync,lstatSync,realpathSync,rmSync,statfsSync} from 'node:fs';
const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(a=>!['--apply','--dry-run'].includes(a)))throw Error('Use --dry-run or --apply');
const targets=['grid','jscad','fossflow','blockbench','bookplate','openreel','openplan3d','texlyre']
 .map(name=>`/opt/utilibre/evaluation-src/${name}-20261011/node_modules`);
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:4*1024**2,timeout:30000});
const ids=run('docker',['ps','-aq']).trim().split('\n').filter(Boolean);
const mounts=run('docker',['inspect','--format','{{range .Mounts}}{{println .Source}}{{end}}',...ids]).split('\n').filter(Boolean);
const processes=run('ps',['-eo','args=']).split('\n');
if(processes.some(p=>/^(?:\S*\/)?(?:npm (?:run build|ci)|pnpm (?:install|build)|cargo build|webpack|vite build)/.test(p)))throw Error('A build is running; retry after it completes');
const before=statfsSync('/opt/utilibre');const checked=[];
for(const path of targets){
 if(!existsSync(path))continue;
 if(lstatSync(path).isSymbolicLink()||realpathSync(path)!==path)throw Error('Unexpected link: '+path);
 if(mounts.some(m=>path===m||path.startsWith(m+'/')||m.startsWith(path+'/')))throw Error('Container mount overlaps: '+path);
 const source=path.slice(0,-'/node_modules'.length);
 if(run('git',['-C',source,'ls-files','--','node_modules']).trim())throw Error('Tracked dependency data: '+path);
 // Source, lockfiles, build output and notices are deliberately retained.
 checked.push({path,bytes:Number(run('du',['-sx','--block-size=1',path]).split(/\s/)[0])});
}
console.log(JSON.stringify({mode:apply?'apply':'dry-run',targets:checked},null,2));
if(apply)for(const {path}of checked)rmSync(path,{recursive:true});
const after=statfsSync('/opt/utilibre');
console.log(JSON.stringify({removed:apply?checked.length:0,reclaimedBytes:(after.bavail-before.bavail)*after.bsize,note:'Dependencies are downloadable again from retained manifests; no images, source trees, live assets, backups or account data removed.'}));
