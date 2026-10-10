import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const app='autoredact', revision='360fc18b976b9278b73d00e2c49e26c76de6557a', version='2.1.3-p1';
const integration=fileURLToPath(new URL('./',import.meta.url));
const stage=mkdtempSync('/opt/utilibre/'+app+'-source-');
try{
 execFileSync('git',['archive','--format=tar','--prefix='+app+'/','--output',stage+'/upstream.tar',revision],{cwd:'/opt/utilibre/src/'+app});
 execFileSync('tar',['-xf',stage+'/upstream.tar','-C',stage]);
 if(app==='gravity')for(const rel of ['public/audio','public/Moon-TomBrown.webp','public/earth_daymap.jpg'])rmSync(stage+'/'+app+'/'+rel,{recursive:true,force:true});
 mkdirSync(stage+'/'+app+'/utilibre');
 cpSync(integration,stage+'/'+app+'/utilibre/'+app,{recursive:true});
 cpSync('/opt/utilibre/src/'+app+'/dist/licenses',stage+'/'+app+'/utilibre/dependency-notices',{recursive:true});
 writeFileSync(stage+'/'+app+'/utilibre/BUILD.txt',app+' '+version+', upstream '+revision+'. Apply utilibre/'+app+'/local-source.patch using git apply --unidiff-zero. Node24, npm ci --ignore-scripts, then use asset copy/build instructions in build.sh (its git revision guard requires the pinned checkout). No secrets required. The exact package lock pins dependencies. Corresponding source is supplied for the static build. The root npm licence declaration GPL-3.0 is normalized to GPL-3.0-only in the inventory. Original LICENSE and component grants are preserved. See utilibre/'+app+'/README.md and dependency-notices.\n');
 execFileSync('tar',['-czf',stage+'/'+app+'-utilibre.tar.gz','-C',stage,app]);
 renameSync(stage+'/'+app+'-utilibre.tar.gz','/opt/utilibre/toolbox-public/'+app+'-utilibre.tar.gz');
}finally{rmSync(stage,{recursive:true,force:true});}
