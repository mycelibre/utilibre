import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
export const reserve=process.argv.includes('--reserve-oct28');
export const reserveSpec=reserve?JSON.parse(fs.readFileSync(new URL('../security-20261028/bson-inputs.json',import.meta.url))):null;
export const root=reserve?'/var/lib/utilibre-maintenance/security-20261028/bson':'/var/lib/utilibre-maintenance/coturn-bson-final-20261012';
export const compiler='maintenance-sudo-trixie-build',work='/work/coturn-bson-final';
export const version='1.30.4-1+deb13u3+utilibre1',oldVersion='1.30.4-1+deb13u3';
export const names=['libbson-1.0-0t64','libmongoc-1.0-0t64'];
export const commit='7e4c66515a46abaf2f488ed0fe5a5c21887b6e1d';
export const base=reserve?reserveSpec.rows[0].base:'sha256:f5e6b255fc16e9f2380f6e7536e57005ccc3a644cfbd2d1b90089bd8bc313374',baseRef=reserve?reserveSpec.rows[0].oldRef:'utilibre-util-linux-galene-turn-turn:security-20261012';
export const candidate=reserve?reserveSpec.rows[0].candidate:'utilibre-coturn:bson-security-20261012';
export const targets=['utilibre-turn-option-turn-1','utilibre-galene-turn-turn-1'];
export const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function run(cmd,args,input){try{return cp.execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:32e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();}catch(e){fs.writeFileSync(root+'/command-error.log',String(e.stdout||'')+String(e.stderr||''),{mode:0o600});throw Error('Coturn native gate failed; restricted diagnostics retained.');}}
export const docker=(...args)=>run('docker',args),inspect=name=>JSON.parse(docker('inspect',name))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-bson-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=32m,mode=1777'];
