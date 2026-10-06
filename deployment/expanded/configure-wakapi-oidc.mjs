// Generate a private native config from the pinned image; never print secrets.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, chmodSync, chownSync } from 'node:fs';
const archive=execFileSync('docker',['cp','utilibre-expanded-wakapi-1:/app/config.yml','-']);
const original=execFileSync('tar',['-xOf','-','config.yml'],{input:archive,encoding:'utf8'});
const client=JSON.parse(readFileSync('/opt/utilibre/identity-data/data/private/oidc-clients.json','utf8')).wakapi;
const provider={name:'utilibre',display_name:'Utilibre',client_id:client.client_id,client_secret:client.client_secret,endpoint:'https://auth.utilibre.org/application/o/wakapi/',scopes:['offline_access']};
if((original.match(/^  oidc:.*$/gm)||[]).length!==1) throw Error('Unexpected pinned configuration');
const generated=original.replace(/^  oidc:.*$/m,`  oidc: ${JSON.stringify([provider])}`);
const target=new URL('.env.wakapi-config.yml',import.meta.url);
writeFileSync(target,generated,{mode:0o600});chmodSync(target,0o600);chownSync(target,65532,65532);
console.log('Generated private Wakapi native OIDC config; retained upstream defaults.');
