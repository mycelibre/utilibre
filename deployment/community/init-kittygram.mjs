import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const root='/opt/utilibre/kittygram';
await mkdir(root,{recursive:true,mode:0o700});
try {
  await writeFile(`${root}/runtime.env`,`SECRET=${randomBytes(48).toString('hex')}\n`,{flag:'wx',mode:0o600});
  console.log('Created private Kittygram signing secret.');
}catch(error){if(error.code!=='EEXIST')throw error;console.log('Preserved existing Kittygram signing secret.');}
