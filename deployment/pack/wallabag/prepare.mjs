// Create secrets once; refuse to replace state or credentials. Never print them.
import {mkdir, writeFile, access, chmod, chown} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
process.umask(0o077);
const root='/opt/utilibre/pack-secrets';
if (await access('/opt/utilibre/pack-data/wallabag/db/wallabag.sqlite').then(()=>true,()=>false)) throw Error('Existing database preserved; new initialization refused.');
await mkdir(root,{recursive:true,mode:0o700});
for (const path of [`${root}/wallabag.env`,`${root}/wallabag-owner.json`]) {
  if (await access(path).then(()=>true,()=>false)) throw Error('Secrets already exist; refusing to replace them.');
}
await writeFile(`${root}/wallabag.env`,`APP_SECRET=${randomBytes(32).toString('hex')}\n`,{mode:0o600,flag:'wx'});
await writeFile(`${root}/wallabag-owner.json`,JSON.stringify({username:'admin',email:'admin@utilibre.org',password:randomBytes(30).toString('base64url')})+'\n',{mode:0o600,flag:'wx'});
for (const path of ['/opt/utilibre/pack-data/wallabag','/opt/utilibre/pack-data/wallabag/db']) {
  await mkdir(path,{recursive:true,mode:0o700});
  await chmod(path,0o700); await chown(path,4007,4007);
}
console.log('Private credentials and empty storage prepared; no account created yet.');
