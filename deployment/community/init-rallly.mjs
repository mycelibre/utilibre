// Generate private deployment configuration without logging any credentials.
import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,chmodSync,mkdirSync,chownSync} from 'node:fs';
const clients=JSON.parse(readFileSync('/opt/utilibre/identity-data/data/private/oidc-clients.json','utf8'));
if(!clients.rallly) throw Error('Configure the restricted Rallly OIDC client first.');
const destination=new URL('.env.rallly',import.meta.url);
let contents=existsSync(destination)?readFileSync(destination,'utf8'):'';
function set(name,value){
  if(!/^[A-Za-z0-9_-]+$/.test(value)) throw Error('Unexpected credential format');
  const pattern=new RegExp(`^${name}=.*$`,'m');
  contents=pattern.test(contents)?contents.replace(pattern,`${name}=${value}`):`${contents.trimEnd()}\n${name}=${value}\n`;
}
for(const name of ['RALLLY_DB_PASSWORD','RALLLY_SECRET_PASSWORD']){
  if(!new RegExp(`^${name}=.+$`,'m').test(contents)) set(name,randomBytes(48).toString('base64url'));
}
set('RALLLY_OIDC_CLIENT_ID',clients.rallly.client_id);
set('RALLLY_OIDC_CLIENT_SECRET',clients.rallly.client_secret);
writeFileSync(destination,contents.trimStart(),{mode:0o600});chmodSync(destination,0o600);
const db='/opt/utilibre/community-data/rallly-db';
mkdirSync(db,{recursive:true,mode:0o700});chownSync(db,70,70);chmodSync(db,0o700);
console.log('Rallly private configuration prepared; credentials withheld.');
