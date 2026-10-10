// Native engine configuration only. Run after configure-degoog.mjs; then recreate
// only DeGoog to load the read-only modules and exact outgoing-host allowlist.
import {mkdirSync,copyFileSync,existsSync,writeFileSync,readFileSync,chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const revision='d48c4b555421e824342c51d68482dd0898e54d0f';
const directory='/opt/utilibre/community-src/degoog-searx-engines';
const data='/opt/utilibre/community-data/degoog';
const backup=`/opt/utilibre/community-backups/degoog-before-general-search-${Date.now()}`;
mkdirSync(backup,{recursive:true,mode:0o700});
for(const name of ['server-settings.json','plugin-settings.json','default-engines.json']){
  if(existsSync(`${data}/${name}`)){copyFileSync(`${data}/${name}`,`${backup}/${name}`);chmodSync(`${backup}/${name}`,0o600)}
}
copyFileSync(`${directory}/SOURCE.json`,`${backup}/SOURCE.json`);
const manifest=JSON.parse(readFileSync(`${directory}/SOURCE.json`,'utf8'));
if(manifest.revision!==revision)throw Error('Review the engine revision before changing the installed bridge.');
async function pinned(path){
  const r=await fetch(`https://raw.githubusercontent.com/searxng/searxng/${revision}/${path}`,{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`Pinned source unavailable: ${path} (${r.status})`);
  const b=Buffer.from(await r.arrayBuffer());if(b.length>5000000)throw Error('Unexpected source size');return b;
}
for(const name of ['google_cse.py','google.py']){
  const bytes=await pinned(`searx/engines/${name}`);
  writeFileSync(`${directory}/${name}`,bytes,{mode:0o644});manifest.hashes[name]=createHash('sha256').update(bytes).digest('hex');
}
const traitsBytes=await pinned('searx/data/engine_traits.json'),traits=JSON.parse(traitsBytes);
manifest.traitsSource={path:'searx/data/engine_traits.json',sha256:createHash('sha256').update(traitsBytes).digest('hex')};
for(const name of ['google_cse','google']){
  const bytes=Buffer.from(JSON.stringify(traits[name]??traits.google)+'\n');
  writeFileSync(`${directory}/${name}.traits.json`,bytes,{mode:0o644});manifest.hashes[`${name}.traits.json`]=createHash('sha256').update(bytes).digest('hex');
}
manifest.engines=[...new Set([...manifest.engines,'google_cse'])];manifest.supportFiles=['google.py'];
writeFileSync(`${directory}/SOURCE.json`,JSON.stringify(manifest,null,2)+'\n');
const privacyPolicy=`Utilibre sends Web searches to Google Custom Search and Mwmbl from its server. Google CSE uses the pinned upstream engine's unofficial route and Blackle partner identifier. Books searches use Open Library; technology searches use Hacker News. These providers receive your query and the server's connection metadata. Their retention is not verified here. Result thumbnails, when available, are fetched through Utilibre from Google image hosts or Internet Archive. Your browser does not contact them to display results. Links you open leave Utilibre.

No public accounts or search index are created. Search responses use a bounded in-memory cache for up to ten minutes. Provider tokens and rate-limit counters can remain in memory for one hour; proxied images have a one-day browser/shared-cache lifetime. Browser preferences can survive closing the tab. Cloudflare proxies this hostname and Caddy terminates HTTPS; they process requests and connection metadata. Do not treat searches as confidential.

Utilibre envía las búsquedas web a Google Custom Search y Mwmbl desde su servidor. Google CSE usa la ruta no oficial y el identificador asociado a Blackle del motor original fijado. Las búsquedas de libros usan Open Library; las de tecnología, Hacker News. Estos proveedores reciben tu consulta y los metadatos de conexión del servidor. No verificamos aquí cuánto tiempo los conservan. Las miniaturas disponibles se obtienen mediante Utilibre desde los servidores de imágenes de Google o Internet Archive. Tu navegador no los contacta para mostrar los resultados. Los enlaces que abrís salen de Utilibre.

No se crean cuentas públicas ni un índice de búsquedas. Las respuestas usan una caché limitada en memoria por hasta diez minutos. Los tokens del proveedor y los contadores de solicitudes pueden permanecer en memoria una hora; las imágenes intermediadas admiten una caché del navegador o compartida de un día. Las preferencias del navegador pueden conservarse al cerrar la pestaña. Cloudflare intermedia este dominio y Caddy termina HTTPS; procesan las solicitudes y los metadatos de conexión. No trates las búsquedas como confidenciales.

[Utilibre](https://utilibre.org/) · [Privacy](https://utilibre.org/en/privacy) · [Privacidad](https://utilibre.org/es/privacy) · [Source / Código fuente](/utilibre-source/degoog-utilibre.tar.gz)`;
const program=`import {setSettings} from './src/server/utils/settings/plugin-settings.ts';import {updateInstanceSettings} from './src/server/utils/settings/server-settings.ts';await setSettings('searx-openlibrary-engine',{searchTypeOverride:'books'});await setSettings('searx-mwmbl-engine',{timeoutMs:'4000'});await setSettings('searx-google_cse-engine',{timeoutMs:'12000',score:'2'});await updateInstanceSettings({nojsEnabled:true,privacyPolicy:${JSON.stringify(privacyPolicy)}});console.log('Native general search configuration updated; credentials and browser preferences preserved.');process.exit(0);`;
execFileSync('docker',['exec','-i','utilibre-evaluation-degoog-1','bun','run','-'],{input:program,stdio:['pipe','inherit','pipe'],timeout:30000});
console.log(`Private configuration backup: ${backup}`);
