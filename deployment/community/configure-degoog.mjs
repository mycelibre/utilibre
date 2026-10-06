// After init-degoog.mjs: install pinned AGPL engines through DeGoog's native bridge.
// No code from the separately licensed/unlicensed extensions repository is used.
import {mkdirSync,copyFileSync,existsSync,writeFileSync,chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const revision='d48c4b555421e824342c51d68482dd0898e54d0f';
const directory='/opt/utilibre/community-src/degoog-searx-engines';
const engines=['mwmbl','openlibrary','hackernews'];
mkdirSync(directory,{recursive:true,mode:0o755});
const hashes={};
for(const file of [...engines.map(x=>`searx/engines/${x}.py`),'LICENSE']){
  const response=await fetch(`https://raw.githubusercontent.com/searxng/searxng/${revision}/${file}`,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`Pinned source unavailable: ${file} (${response.status})`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>1000000)throw Error('Unexpected engine source size');
  const name=file.split('/').at(-1);
  writeFileSync(`${directory}/${name}`,bytes,{mode:0o644});
  hashes[name]=createHash('sha256').update(bytes).digest('hex');
}
writeFileSync(`${directory}/SOURCE.json`,JSON.stringify({project:'SearXNG',revision,license:'AGPL-3.0-or-later',engines,hashes},null,2)+'\n');
const data='/opt/utilibre/community-data/degoog';
const backup=`/opt/utilibre/community-backups/degoog-before-engines-${Date.now()}`;
mkdirSync(backup,{recursive:true,mode:0o700});
for(const name of ['server-settings.json','plugin-settings.json','default-engines.json']){
  if(existsSync(`${data}/${name}`)){copyFileSync(`${data}/${name}`,`${backup}/${name}`);chmodSync(`${backup}/${name}`,0o600)}
}
const settings={
  searxCompatEnabled:true,searxApiEnabled:false,fourgetCompatEnabled:false,
  degoogIndexerEnabled:false,degoogIndexerPublicExport:false,degoogFaviconStoreEnabled:false,
  blockClientLeaks:true,imageProxyAllowLocal:false,proxyEnabled:false,
  requestBodyMaxKb:'256',rateLimitEnabled:true,rateLimitBurstMax:'60',rateLimitLongMax:'600',
  rateLimitSuggestEnabled:true,postMethodEnabled:true,streamingAutoRetry:false,
  privacyPolicy:'Utilibre sends your searches to Mwmbl, Open Library and Hacker News through its server. No accounts or search index are created. Search responses use a bounded in-memory cache for up to ten minutes; rate-limit counters can last one hour. Cloudflare and the Caddy edge process connection metadata. Links you open leave Utilibre.\n\nUtilibre envía tus búsquedas a Mwmbl, Open Library y Hacker News desde su servidor. No crea cuentas ni un índice de búsquedas. Las respuestas usan una caché limitada en memoria por hasta diez minutos; los contadores de solicitudes pueden durar una hora. Cloudflare y Caddy procesan metadatos de conexión. Los enlaces que abrís salen de Utilibre.\n\n[Utilibre](https://utilibre.org/) · [Privacy](https://utilibre.org/en/privacy) · [Privacidad](https://utilibre.org/es/privacy) · [Source / Código fuente](/utilibre-source/degoog-utilibre.tar.gz)'
};
const program=`import {updateInstanceSettings} from './src/server/utils/settings/server-settings.ts';await updateInstanceSettings(${JSON.stringify(settings)});console.log('Native settings updated; existing identity and credentials preserved.');process.exit(0);`;
execFileSync('docker',['exec','-i','utilibre-evaluation-degoog-1','bun','run','-'],{input:program,stdio:['pipe','inherit','pipe'],timeout:30000});
console.log('Pinned SearXNG engines prepared. Restart DeGoog with the read-only engine mount.');
