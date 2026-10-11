// Fixed public destinations, native TLS verification, no browser/user activity.
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
export const targets=[
 ['portal-en','https://utilibre.org/en/',/Utilibre/],
 ['portal-es','https://utilibre.org/es/',/Utilibre/],
 ['sitemap','https://utilibre.org/sitemap.xml',/<(?:sitemapindex|urlset)[\s>]/],
 ['pdf','https://pdf.utilibre.org/',/BentoPDF/i],
 ['qr','https://qrtools.utilibre.org/?lang=en',/QR/],
 ['transfer','https://drop.utilibre.org/',/PairDrop/],
 ['search-health','https://search.utilibre.org/healthz',/OK/i],
 ['identity','https://auth.utilibre.org/',/authentik/i],
];
export function validResponse(response,text,pattern){return response.status===200&&pattern.test(text);}
export async function probe([id,url,pattern],request=fetch){
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const response=await request(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'user-agent':'Utilibre-synthetic-availability/1.0'}});
   // Only a fixed Authentik login redirect is valid; never follow arbitrary locations.
   if(id==='identity'&&[302,303].includes(response.status)){
    const to=new URL(response.headers.get('location'),url);
    if(to.origin===new URL(url).origin&&['/if/flow/default-authentication-flow/','/flows/-/default/authentication/'].includes(to.pathname)){await response.body?.cancel();return {id,status:'passed',check:'TLS and native login redirect'};}
   }
   let size=0,text='';
   for await(const chunk of response.body||[]){size+=chunk.length;if(size>1024**2)throw Error('Response bound');text+=Buffer.from(chunk).toString();}
   if(validResponse(response,text,pattern))return {id,status:'passed',check:'TLS, HTTP and expected response marker'};
  }catch{/* Do not log response bodies, connection identifiers or arbitrary errors. */}
  if(attempt===1)await delay(1500);
 }
 return {id,status:'failed',check:'TLS/HTTP/content check; inspect independently'};
}
export async function run(){
 const results=[];for(const target of targets)results.push(await probe(target));
 if(process.env.UTILIBRE_ALERT_DRILL==='true')results.push({id:'synthetic-alert-drill',status:'failed',check:'Deliberately failed notification drill; not a production outage'});
 const report={date:new Date().toISOString(),environment:process.env.GITHUB_ACTIONS?'GitHub-hosted external runner':'local execution; not independent outage evidence',results,limitations:'Public entry-point checks, not authenticated tasks or uptime history. No visitor requests or content collected.'};
 console.log(JSON.stringify(report,null,2));
 if(results.some(x=>x.status!=='passed'))process.exitCode=1;
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
