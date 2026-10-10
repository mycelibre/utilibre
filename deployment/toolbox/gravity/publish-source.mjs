import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const app='gravity', revision='28e912b8f6808a4bf892fa0f1ffacf857b0faa3a', version='1.0.0-28e912b-p1';
const integration=fileURLToPath(new URL('./',import.meta.url));
const stage=mkdtempSync('/opt/utilibre/'+app+'-source-');
try{
 execFileSync('git',['archive','--format=tar','--prefix='+app+'/','--output',stage+'/upstream.tar',revision],{cwd:'/opt/utilibre/src/'+app});
 execFileSync('tar',['-xf',stage+'/upstream.tar','-C',stage]);
 if(app==='gravity')for(const rel of ['public/audio','public/Moon-TomBrown.webp','public/earth_daymap.jpg'])rmSync(stage+'/'+app+'/'+rel,{recursive:true,force:true});
 mkdirSync(stage+'/'+app+'/utilibre');
 cpSync(integration,stage+'/'+app+'/utilibre/'+app,{recursive:true});
 cpSync('/opt/utilibre/src/'+app+'/dist/licenses',stage+'/'+app+'/utilibre/dependency-notices',{recursive:true});
 writeFileSync(stage+'/'+app+'/utilibre/BUILD.txt',app+' '+version+', upstream '+revision+'. Apply utilibre/'+app+'/local-source.patch using git apply --unidiff-zero. Node24, npm ci --ignore-scripts, then use asset copy/build instructions in build.sh (its git revision guard requires the pinned checkout). No secrets required. The exact package lock pins dependencies. Corresponding source is supplied for the static build; Gravity excludes unused original photographic textures/music that are not part of the served work. Original LICENSE grant is preserved; only/or-later scope is unconfirmed. See README.md and dependency-notices.\n');
 execFileSync('tar',['-czf',stage+'/'+app+'-utilibre.tar.gz','-C',stage,app]);
 renameSync(stage+'/'+app+'-utilibre.tar.gz','/opt/utilibre/toolbox-public/'+app+'-utilibre.tar.gz');
}finally{rmSync(stage,{recursive:true,force:true});}
