// Native blank-DB feed/SMTP test. No production configuration/data attached.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,chmodSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url));
const jose=process.argv[2]==='--jose',oct28=process.argv[2]==='--oct28'||jose,netReview=process.argv[2]==='--net'||oct28;
const directory=jose?'/var/lib/utilibre-maintenance/security-20261028/jose-caddy':oct28?'/var/lib/utilibre-maintenance/security-20261028/caddy':'/var/lib/utilibre-maintenance/caddy-security-20261011'+(netReview?'/net':'');
const baseline=process.argv[2]==='--baseline';assert(!process.argv[2]||baseline||netReview,'Only explicit baseline/net comparison supported');
const build=baseline?{rows:JSON.parse(readFileSync(recipe+'images.json')).map(row=>({...row,candidate:row.base,candidateId:row.baseId}))}:JSON.parse(readFileSync(directory+'/build.json'));
const web=build.rows.find(row=>row.kind==='newsletters-web');
const smtp=build.rows.find(row=>row.kind==='newsletters-mail-jobs');
const names={web:'maintenance-newsletters-caddy-web',smtp:'maintenance-newsletters-caddy-smtp',volume:'maintenance-newsletters-caddy-fixture'};
let base='http://127.0.0.1:33125',address='127.0.0.1',smtpPort=33225,createdNetwork=false;const network='maintenance-newsletters-caddy-isolated';
const certificate=mkdtempSync(directory+'/synthetic-certificate-');chmodSync(certificate,0o755);
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Synthetic newsletter stage command failed; no application output retained.');}}
let createdVolume=false,createdWeb=false,createdSmtp=false,browser;
try{
 if(oct28){docker(['network','create','--internal',network]);createdNetwork=true;const subnet=JSON.parse(docker(['network','inspect',network]))[0].IPAM.Config[0].Subnet;address=execFileSync('python3',['-c','import ipaddress,sys;print(ipaddress.ip_network(sys.argv[1])[10])',subnet],{encoding:'utf8'}).trim();base='http://'+address+':18080';smtpPort=25;}
 assert.equal(docker(['volume','ls','--filter','name=^'+names.volume+'$','--format','{{.Name}}']).trim(),'','Do not reuse any existing test volume');
 for(const name of [names.web,names.smtp])assert.equal(docker(['ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}']).trim(),'','Do not reuse an existing stage');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN=fixture.invalid','-days','1','-keyout',certificate+'/key.pem','-out',certificate+'/certificate.pem'],{stdio:'ignore'});
 chmodSync(certificate+'/key.pem',0o444);chmodSync(certificate+'/certificate.pem',0o444);
 for(const row of [web,smtp])assert.equal(docker(['image','inspect',row.candidate,'--format','{{.Id}}']).trim(),row.candidateId);
 docker(['volume','create','--driver','local','--opt','type=tmpfs','--opt','device=tmpfs','--opt','o=size=32m,uid=1000,gid=1000,mode=0700',names.volume]);createdVolume=true;
 const common=['--read-only','--user','1000:1000','--cpus','.5','--memory','256m','--memory-swap','256m','--pids-limit','96','--cap-drop','ALL','--security-opt','no-new-privileges:true','--log-driver','none',
  '--mount','type=volume,src='+names.volume+',dst=/fixture-data','--mount','type=bind,src='+recipe+'newsletters-fixture.mjs,dst=/fixture.mjs,readonly',
  '--mount','type=bind,src='+certificate+',dst=/fixture-certificate,readonly','--tmpfs','/tmp:size=32m,mode=1777'];
 docker(['run','-d','--name',names.web,...common,...(oct28?['--network',network,'--ip',address]:['-p','127.0.0.1:33125:18080','-p','127.0.0.1:33225:25']),
  '--mount','type=bind,src='+recipe+'newsletters.Caddyfile,dst=/fixture.Caddyfile,readonly','--entrypoint','sh',web.candidate,'-c',
  'exec > /tmp/fixture-startup.log 2>&1; node build/application.mjs /fixture.mjs --type initialize 3>/dev/null && { node build/application.mjs /fixture.mjs --type webServer --port 18000 & exec node_modules/.bin/caddy run --config /fixture.Caddyfile; }']);createdWeb=true;
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(base);if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
 if(!ready){try{writeFileSync(directory+'/synthetic-newsletters-startup.txt',docker(['exec',names.web,'cat','/tmp/fixture-startup.log']),{mode:0o600});}catch{}}
 assert(ready,'Blank native DB, webserver and Caddy start');
 docker(['run','-d','--name',names.smtp,'--network','container:'+names.web,...common,'--entrypoint','node',smtp.candidate,'build/application.mjs','/fixture.mjs','--type','emailServer']);createdSmtp=true;
 browser=await chromium.launch();const context=await browser.newContext({locale:'en-US',serviceWorkers:'block'});const outside=new Set(),errors=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){outside.add(u.origin);return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 const title='Fictional Caddy maintenance newsletter';
 await page.goto(base);await page.locator('[name="title"]').fill(title);await page.getByRole('button',{name:'Create feed',exact:true}).click();
 await page.waitForURL(u=>/^\/feeds\/[a-z0-9]{40}$/.test(u.pathname));
 const id=new URL(page.url()).pathname.split('/')[2];assert(/^[a-z0-9]{40}$/.test(id));
 // This receiver is loopback-only; Python sends no messages off-host.
 try{execFileSync('python3',['-c',`import smtplib,time\nfrom email.message import EmailMessage\nm=EmailMessage();m['From']='fictional@example.invalid';m['To']='${id}@fixture.invalid';m['Subject']='Fictional Caddy bulletin';m.set_content('Fictional paper museum opens at ten.');\nfor attempt in range(30):\n try:\n  s=smtplib.SMTP('${address}',${smtpPort},timeout=5);break\n except (ConnectionRefusedError,ConnectionResetError,smtplib.SMTPServerDisconnected):\n  time.sleep(.2)\nelse:\n raise RuntimeError('Synthetic SMTP not ready')\ns.send_message(m);s.quit()`],{stdio:'pipe',timeout:30000});}catch(e){writeFileSync(directory+'/synthetic-smtp-error.txt',String(e.stderr||''),{mode:0o600});throw Error('Synthetic SMTP transaction failed; private fixture diagnostic retained.');}
 const xml=await(await fetch(base+'/feeds/'+id+'.xml')).text();assert(xml.includes('Fictional Caddy bulletin'));assert(xml.includes('Fictional paper museum'));
 await page.reload();await page.getByPlaceholder(title,{exact:true}).fill(title);await page.getByRole('button',{name:'Delete feed',exact:true}).click();
 await page.waitForTimeout(300);assert.equal((await fetch(base+'/feeds/'+id+'.xml')).status,404);
 assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 writeFileSync(directory+(baseline?'/newsletters-baseline.json':'/newsletters-stage.json'),JSON.stringify({date:new Date().toISOString(),status:'passed',deployed:false,baseline,webImage:web.candidateId,smtpImage:smtp.candidateId,nativeMigration:true,browserFeedCreate:true,loopbackSmtpAccepted:!oct28,isolatedSmtpAccepted:oct28,backendEgress:oct28?'internal bridge, no external route':'legacy fixture',atomContents:true,nativeDelete:true,externalBrowserOrigins:[...outside],limitations:'Synthetic local SMTP/web roles and blank DB; public MX/TLS delivery and live stored subscriptions not modified or re-tested.'},null,2)+'\n',{mode:0o600});
 console.log('Newsletter native blank DB, Caddy static/proxy, browser feed create, SMTP-to-Atom and deletion passed.');
}finally{
 if(browser)await browser.close();
 if(createdSmtp)docker(['rm','-f',names.smtp]);if(createdWeb)docker(['rm','-f',names.web]);if(createdVolume)docker(['volume','rm',names.volume]);
 rmSync(certificate,{recursive:true});if(createdNetwork)docker(['network','rm',network]);
}
