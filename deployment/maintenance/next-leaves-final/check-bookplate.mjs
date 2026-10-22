// Disposable native PostgreSQL + production image; no existing account data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {request,chromium} from '../../../portal/node_modules/playwright/index.mjs';
import {profile} from './profile.mjs';
const {image,dir,next}=profile;
const base='http://172.29.240.10:3000',net='maintenance-bookplate-next-native',db=net+'-db',app=net+'-app';
mkdirSync(dir,{recursive:true,mode:0o700});
const docker=args=>{try{return execFileSync('docker',args,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']});}catch{throw Error('Bookplate staging command failed; child details suppressed');}};
const secret=randomBytes(32).toString('hex'),created=[],contexts=[],checks=[];let browser;
try{
 docker(['network','create','--internal','--subnet','172.29.240.0/24',net]);created.push(['network','rm',net]);
 docker(['run','-d','--name',db,'--network',net,'--log-driver','none','--memory','256m','--cpus','.5','--tmpfs','/var/lib/postgresql/data:rw,size=128m','-e','POSTGRES_PASSWORD='+secret,'-e','POSTGRES_USER=bookplate','-e','POSTGRES_DB=bookplate','postgres:16-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea']);created.push(['rm','-f','-v',db]);
 for(let i=0;i<30;i++){try{docker(['exec',db,'pg_isready','-U','bookplate']);break;}catch{}await new Promise(r=>setTimeout(r,500));}
 // Only this isolated provisioning fixture has open registration; production
 // stays closed. Native PoW is not part of this version-regression check.
 docker(['run','-d','--name',app,'--network',net,'--ip','172.29.240.10','--log-driver','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--cpus','1','--user','1000:1000','--tmpfs','/tmp:size=32m','--tmpfs','/data/uploads:uid=1000,gid=1000,size=32m','-e',`DATABASE_URL=postgres://bookplate:${secret}@${db}:5432/bookplate`,'-e','AUTH_SECRET='+secret,'-e','PUBLIC_URL='+base,'-e','REGISTRATION=open','-e','SIGNUP_BOT_CHECK=false',image]);created.push(['rm','-f','-v',app]);
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert(ready,'Synthetic candidate startup');
 const users=[0,1].map(i=>({name:'Fictional Security Reader '+i,email:`fictional-${i}@example.invalid`,password:randomBytes(24).toString('hex')}));
 for(const user of users){
  const c=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});contexts.push(c);
   const r=await c.post('/api/auth/sign-up/email',{data:user});assert.equal(r.status(),200,'Native stage registration');
 }
 const [a,b]=contexts,id='fictional-'+randomUUID(),book={id,title:'Fictional Security Field Notes',author:'Example Author',status:'reading',rating:0,colorIndex:0,pages:120,genre:'Fiction',addedAt:new Date().toISOString()};
 assert((await a.put('/api/books/'+id,{data:book})).ok());
 assert((await (await a.get('/api/books')).json()).books.some(x=>x.id===id));
 assert(!(await (await b.get('/api/books')).json()).books.some(x=>x.id===id));
 const guest=await request.newContext({baseURL:base});contexts.push(guest);assert.equal((await guest.get('/api/books')).status(),401);
 const exported=await a.get('/api/export');assert(exported.ok());const zip=await exported.body();assert.equal(zip.subarray(0,2).toString(),'PK');
 checks.push('Native account creation, saved book, A/B isolation, anonymous denial and ZIP export');
 browser=await chromium.launch();const c=await browser.newContext({storageState:await a.storageState()}),p=await c.newPage(),external=[],errors=[];
 p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)external.push(new URL(r.url()).origin);});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base,{waitUntil:'networkidle'});await p.getByText(book.title,{exact:true}).first().waitFor();await p.reload({waitUntil:'networkidle'});await p.getByText(book.title,{exact:true}).first().waitFor();
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 assert((await a.delete('/api/books/'+id)).ok());assert(!(await (await a.get('/api/books')).json()).books.some(x=>x.id===id));
 checks.push('Chromium saved-library render/reload, native book deletion; no external browser requests or script errors');
 assert.equal(docker(['exec',app,'node','-p','require("next/package.json").version']).trim(),next);
 writeFileSync(dir+'/bookplate-native.json',JSON.stringify({date:new Date().toISOString(),status:'passed',passed:true,image,imageId:docker(['image','inspect','--format','{{.Id}}',image]).trim(),checks,scope:'Isolated synthetic accounts and RAM-backed database; not public-edge or real-user migration evidence'},null,2)+'\n',{mode:0o600});
 console.log('Bookplate patched Next.js: '+checks.join('; '));
}finally{await browser?.close();for(const c of contexts)await c.dispose();for(const args of created.reverse())docker(args);}
