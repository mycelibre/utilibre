// Scoped release of the tested catalogue metadata build; no dependencies resolved.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../language-final/release.mjs';
assert.equal(process.argv[2],'--apply');process.umask(0o077);
const root='/var/lib/utilibre-maintenance/releases-20261106';
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']});
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const oldImage='sha256:d53e7d50db9a679656e301fc5d24a3acc907bcfa58682b17a3211f24632052a3',newImage='sha256:0243688ca5bc6f67632f74b66e0a0e877aebb02cd00940605a12d3beee75aeca',newRef='utilibre-portal:release-refresh-20261106';
assert.equal(inspect(newRef).Id,newImage);assert(readFileSync(root+'/portal-staging.txt','utf8').includes('es: current version records rendered'));
for(const [kind,id] of [['before',oldImage],['after',newImage]]){const d=JSON.parse(readFileSync(root+'/portal-'+kind+'-scan.json'));assert.equal(d.Metadata.ImageID,id);assert(d.Results.some(r=>r.Packages?.length));assert(d.Results.every(r=>!r.Vulnerabilities?.length));}
const x=inspect('public-utility-portal-1'),l=x.Config.Labels;assert([oldImage,newImage].includes(x.Image));
const g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name:'public-utility-portal-1',service:'portal',oldImage,newImage,oldContainerId:x.Id,oldRestartCount:x.RestartCount}]};
const publicCheck=()=>{for(const lang of ['en','es']){const h=run('curl',['--fail','--silent','--show-error','--max-time','25','https://utilibre.org/'+lang+'/software']);for(const v of ['2.10.8-p1','1.30.4','3.9.0','0.42.0-p1','0.7.101-p1','4.2.0-p1','1.3.2-p1','32.6.10-p1'])assert(h.includes(v),v);}};
if(x.Image===newImage){await checkExistingGroup(g,'new');publicCheck();console.log('Portal exact artifact already active');process.exit(0);}
const file=g.cwd+'/.env',before=readFileSync(file,'utf8'),line=before.match(/^PORTAL_IMAGE=.*$/m)?.[0];assert(line);assert.equal(inspect(line.slice(13)).Id,oldImage);const after=before.replace(line,'PORTAL_IMAGE='+newRef);
const shape=()=>{const {image,...s}=JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services.portal;return createHash('sha256').update(JSON.stringify(s)).digest('hex');};const hash=shape();
const record={sourceRevision:'6f9ef804ffcc2f80fdd211fd185231204f325c8d',oldImage,newImage,previousImageLine:line};const save=async()=>writeFileSync(root+'/portal-release.json',JSON.stringify({...record,status:g.status,rollback:g.rollback},null,2)+'\n');
await releaseGroup(g,{save,preflight:async()=>{assert.equal(inspect('public-utility-portal-1').Image,oldImage);assert.equal(readFileSync(file,'utf8'),before);},recreate:async()=>{if(!g.rollback){writeFileSync(file,after);assert.equal(shape(),hash);}await recreateExistingGroup(g);},gate:async v=>{await checkExistingGroup(g,v);if(v==='new')publicCheck();},rollbackPins:async()=>{assert.equal(readFileSync(file,'utf8'),after);writeFileSync(file,before);}});
console.log('Portal released; exact image health and EN/ES public version records passed');
