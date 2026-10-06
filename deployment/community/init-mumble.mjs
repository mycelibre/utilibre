import {mkdir,writeFile,chown} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const root='/opt/utilibre/mumble';
await mkdir(root,{recursive:true,mode:0o700});
await mkdir(`${root}/data`,{recursive:true,mode:0o700});
await chown(`${root}/data`,10000,10000);
try {
  await writeFile(`${root}/runtime.env`,[
    `MUMBLE_CONFIG_SERVER_PASSWORD=${randomBytes(24).toString('hex')}`,
    `MUMBLE_SUPERUSER_PASSWORD=${randomBytes(32).toString('hex')}`,
    '',
  ].join('\n'),{flag:'wx',mode:0o600});
  console.log('Created private Mumble pilot and administrator credentials for admin@utilibre.org.');
}catch(error){if(error.code!=='EEXIST')throw error;console.log('Preserved existing Mumble credentials.');}
