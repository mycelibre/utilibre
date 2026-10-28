import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,statfsSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url));
const oct28=process.argv[2]==='--oct28',netReview=process.argv[2]==='--net'||oct28;assert(!process.argv[2]||netReview,'Use --net, --oct28 or no argument');
const directory=oct28?'/var/lib/utilibre-maintenance/security-20261028/caddy':'/var/lib/utilibre-maintenance/caddy-security-20261011'+(netReview?'/net':'');
const artifact=directory+'/artifact';
const compiler=oct28?'sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f':'golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade';
mkdirSync(artifact,{recursive:true,mode:0o700});
const images=oct28?JSON.parse(readFileSync(recipe+'../security-20261028/caddy-inputs.json')).rows:JSON.parse(readFileSync(recipe+'images.json'));
if(netReview&&!oct28)for(const image of images)image.candidate+='-p2';
const space=()=>{const s=statfsSync(directory);assert(s.bavail*s.bsize>=8*1024**3,'Preserve 8 GiB recovery floor');};
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',timeout:600000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});}catch(e){writeFileSync(directory+'/build-error.txt',String(e.stdout||'')+String(e.stderr||''),{mode:0o600});throw Error('Caddy compiler candidate failed; inspect private code-only build diagnostic.');}}
space();
for(const row of images)assert.equal(JSON.parse(docker(['image','inspect',row.base]))[0].Id,row.baseId,'Base image changed');
docker(['run','--rm','--name','maintenance-caddy-build','--cpus','1','--memory','2g','--memory-swap','2g','--pids-limit','128','--read-only','--log-driver','none',
 ...(oct28?['--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','-e','EXPECTED_GO=1.26.10','-v',directory+'/input:/input:ro']:[]),
 '--tmpfs','/work:rw,exec,size=1800m','--tmpfs','/tmp:rw,exec,size=32m',
 '--mount','type=bind,src='+recipe.replace(/\/$/, '')+',dst=/recipe,readonly','--mount','type=bind,src='+artifact+',dst=/out',
 '-e','CADDY_NET_REVIEW='+(netReview?'1':'0'),'--entrypoint','sh',compiler,'/recipe/compile.sh']);
const sha256=createHash('sha256').update(readFileSync(artifact+'/caddy')).digest('hex');
const rows=[];
for(const row of images){space();docker(['build','--network','none','--pull=false','-f',recipe+'Dockerfile','--build-arg','BASE='+row.base,'--build-arg','CADDY_PATH='+row.path,'-t',row.candidate,artifact]);rows.push({...row,candidateId:JSON.parse(docker(['image','inspect',row.candidate]))[0].Id});console.log('Built Caddy-only candidate '+row.kind);}
writeFileSync(directory+'/build.json',JSON.stringify({date:new Date().toISOString(),status:'built-not-tested',deployed:false,compiler,caddy:'2.11.7',netReview,binarySha256:sha256,sourceArchiveSha256:'b430516910839fbaf35c0a9e9df80d1e2e30aa792530293c39f4a97a1b2c9060',rows},null,2)+'\n',{mode:0o600});
