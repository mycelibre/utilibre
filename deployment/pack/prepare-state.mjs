// Generate secrets once, outside the repository. Never print them.
import {mkdir,writeFile,chown} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const base='/opt/utilibre/pack-secrets';
await mkdir(base,{recursive:true,mode:0o700});
const password=randomBytes(32).toString('hex');
const secret=randomBytes(48).toString('hex');
const cryptoKey=randomBytes(32).toString('base64url')+'=';
const env=`POSTGRES_PASSWORD=${password}\nDB_PASSWORD=${password}\nSECRET_KEY=${secret}\nCRYPTO_KEY=${cryptoKey}\n`;
try{await writeFile(`${base}/liberaforms.env`,env,{mode:0o600,flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e}
try{await writeFile(`${base}/liberaforms-owner.json`,JSON.stringify({username:'utilibre',email:'admin@utilibre.org',password:randomBytes(32).toString('base64url')}),{mode:0o600,flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e}
for(const [dir,id] of [['liberaforms/uploads',4002],['liberaforms/db',70]]){const dest=`/opt/utilibre/pack-data/${dir}`;await mkdir(dest,{recursive:true,mode:0o750});await chown(dest,id,id)}
console.log('Forms state and private credentials prepared; existing values preserved.');
