// Native Galene group/password configuration; invited meetings, not public signup.
import {mkdir,readFile,writeFile,chown} from 'node:fs/promises';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
const root='/opt/utilibre/pack-data/galene';
for(const d of [root,`${root}/data`,`${root}/groups`]){await mkdir(d,{recursive:true,mode:0o750});await chown(d,4003,4003)}
let owner;const file='/opt/utilibre/pack-secrets/galene-owner.json';
try{owner=JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;owner={username:'utilibre',email:'admin@utilibre.org',password:randomBytes(24).toString('base64url')};await writeFile(file,JSON.stringify(owner),{mode:0o600,flag:'wx'})}
const salt=randomBytes(16),key=pbkdf2Sync(owner.password,salt,600000,32,'sha256');
const group={displayName:'Utilibre · small meetings',description:'Moderator-led, invitation-only. Media is encrypted in transit, not end-to-end. No recording. / Sala con moderación e invitación. Cifrado en tránsito, no de extremo a extremo. Sin grabación.',public:false,'max-clients':4,'max-history-age':1,'allow-recording':false,'unrestricted-tokens':false,'auto-subgroups':false,autolock:true,autokick:true,users:{[owner.username]:{password:{type:'pbkdf2',hash:'sha-256',salt:salt.toString('hex'),key:key.toString('hex'),iterations:600000},permissions:'op'}}};
for(const [p,obj] of [['data/config.json',{proxyURL:'https://meet.utilibre.org/',writableGroups:false}],['data/ice-servers.json',[{urls:['stun:stun.cloudflare.com:3478']}]],['groups/community.json',group]]){
 const dest=`${root}/${p}`;try{await writeFile(dest,JSON.stringify(obj,null,2)+'\n',{mode:0o640,flag:'wx'});await chown(dest,4003,4003)}catch(e){if(e.code!=='EEXIST')throw e}
}
console.log('Native private room and moderator prepared. Existing configuration preserved. No TURN enabled.');
