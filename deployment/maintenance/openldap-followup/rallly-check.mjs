// Existing Rallly isolated stack, expanded with native authentication, poll,
// guest response and cross-account permission checks. Only synthetic tmpfs data.
import assert from 'node:assert/strict';
import {execFileSync as exec,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
assert(process.argv.slice(2).length===0||JSON.stringify(process.argv.slice(2))==='["--oct22"]');
const oct22=process.argv.includes('--oct22');
const dir=oct22?'/var/lib/utilibre-maintenance/security-20261022/rallly':'/var/lib/utilibre-maintenance/openldap-followup-20261012/images/rallly';
const resultFile=dir+(oct22?'/native.json':'/application.json');
const proof=JSON.parse(fs.readFileSync(dir+'/build.json')),image=proof.imageId;
assert(proof.passed);assert(!fs.existsSync(resultFile));
const tag=randomBytes(4).toString('hex'),network='utilibre-openldap-rallly-'+tag,db=network+'-db',app=network+'-app',base='http://127.0.0.1:3435';
const docker=(...args)=>exec('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4e6,stdio:['ignore','pipe','pipe']}).trim();
const sql=text=>exec('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','rallly','-d','rallly'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
async function ready(fn){for(let n=0;n<100;n++){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Native Rallly readiness timeout');}
let bridge,browser;const outside=new Set(),errors=[];let lastPage;
try{
 docker('network','create','--internal',network);
 const password=randomBytes(32).toString('hex');
 docker('run','-d','--name',db,'--network',network,'--memory','256m','--cpus','1','--pids-limit','128','--log-driver','none','--tmpfs','/var/lib/postgresql/data:rw,size=256m','-e','POSTGRES_USER=rallly','-e','POSTGRES_DB=rallly','-e','POSTGRES_PASSWORD='+password,'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73');
 await ready(()=>{docker('exec',db,'pg_isready','-U','rallly');return true;});
 docker('run','-d','--name',app,'--network',network,'--memory','768m','--cpus','1','--pids-limit','128','--log-driver','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777','--tmpfs','/app/apps/web/.next/cache:rw,size=64m,uid=1001,gid=1001','-e',`DATABASE_URL=postgres://rallly:${password}@${db}:5432/rallly`,'-e','SECRET_PASSWORD='+randomBytes(32).toString('hex'),'-e','NEXT_PUBLIC_BASE_URL='+base,'-e','NEXT_TELEMETRY_DISABLED=1','-e','SUPPORT_EMAIL=operator@example.invalid','-e','NOREPLY_EMAIL=no-reply@example.invalid','-e','REGISTRATION_ENABLED=false','-e','EMAIL_LOGIN_ENABLED=true',image);
 const ip=docker('inspect',app,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');
 bridge=spawn('socat',['TCP4-LISTEN:3435,bind=127.0.0.1,reuseaddr,fork',`TCP4:${ip}:3000`],{detached:true,stdio:'ignore'});
 await ready(async()=>{assert(bridge.exitCode===null);return (await fetch(base+'/login',{signal:AbortSignal.timeout(1000)})).ok;});
 browser=await chromium.launch();
 const context=async()=>{const c=await browser.newContext({locale:'en-US'});c.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)outside.add(new URL(r.url()).origin);});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;};
 // Follow upstream createUserInDb's account/space shape. Native password reset
 // uses a seeded, authorized synthetic token, then native sign-in issues cookies.
 // This does not claim to test email delivery or production OIDC.
 const sessions=[];
 for(const suffix of ['owner','other']){
  const id='ldap'+tag+suffix,email=id+'@example.invalid',token=randomBytes(24).toString('hex'),secret=randomBytes(24).toString('hex');
  sql(`BEGIN; INSERT INTO users(id,name,email,email_verified,locale,time_zone,updated_at) VALUES('${id}','Fictional ${suffix}','${email}',true,'en','UTC',now()); INSERT INTO spaces(id,name,owner_id,tier,updated_at) VALUES('${id}space','Fictional space','${id}','hobby',now()); INSERT INTO space_members(id,space_id,user_id,role,updated_at) VALUES('${id}member','${id}space','${id}','ADMIN',now()); INSERT INTO verifications(id,identifier,value,expires_at) VALUES('${id}reset','reset-password:${token}','${id}',now()+interval '10 minutes'); COMMIT;`);
  const c=await context();
  const reset=await c.request.post(base+'/api/better-auth/reset-password',{headers:{Origin:base},data:{newPassword:secret,token}});assert.equal(reset.status(),200,'Native password setup failed');
  const login=await c.request.post(base+'/api/better-auth/sign-in/email',{headers:{Origin:base},data:{email,password:secret}});assert.equal(login.status(),200,'Native account login failed');
  const current=await c.request.get(base+'/api/better-auth/get-session');assert.equal((await current.json()).user.id,id);
  sessions.push({id,c});
 }
 const page=lastPage=await sessions[0].c.newPage();
 await page.goto(base+'/new');await page.getByLabel(/title|event/i).fill('Fictional LDAP workshop');await page.getByLabel('Location',{exact:true}).fill('Online');
 await page.getByTitle('Next month').click();for(const day of ['5','7','10','15'])await page.getByText(day,{exact:true}).first().click();
 await page.getByRole('button',{name:/^create poll$/i}).click();await page.waitForURL(/\/poll\/[^/?]+/);
 const pollId=new URL(page.url()).pathname.split('/').at(-1);assert.match(pollId,/^[a-zA-Z0-9_-]+$/);
 const share=page.getByRole('dialog',{name:'Share'});await share.waitFor();await share.getByRole('button',{name:'Close'}).click();
 assert.equal(sql(`SELECT user_id FROM polls WHERE id='${pollId}'`),sessions[0].id);
 const guest=await context(),invite=lastPage=await guest.newPage();await invite.goto(base+'/invite/'+pollId);
 await invite.getByTestId('vote-selector').nth(0).click();await invite.getByTestId('vote-selector').nth(2).click();await invite.getByRole('button',{name:'Continue',exact:true}).click();
 await invite.getByPlaceholder('Jessie Smith',{exact:true}).fill('Fictional participant');await invite.getByRole('button',{name:'Save availability',exact:true}).click();
 await invite.getByText('Your response has been saved',{exact:true}).waitFor();assert.equal(sql(`SELECT count(*) FROM participants WHERE poll_id='${pollId}' AND name='Fictional participant'`),'1');
 const unauthorized=await sessions[1].c.request.post(base+'/api/trpc/polls.markAsDeleted',{data:{json:{pollId}}});assert.equal(unauthorized.status(),403);assert.equal(sql(`SELECT deleted FROM polls WHERE id='${pollId}'`),'f');
 const guestDenied=await guest.request.post(base+'/api/trpc/polls.markAsDeleted',{data:{json:{pollId}}});assert([401,403].includes(guestDenied.status()));assert.equal(sql(`SELECT deleted FROM polls WHERE id='${pollId}'`),'f');
 await page.reload();await page.getByText('Fictional participant',{exact:true}).waitFor();
 const deleted=await sessions[0].c.request.post(base+'/api/trpc/polls.markAsDeleted',{data:{json:{pollId}}});assert.equal(deleted.status(),200);assert.equal(sql(`SELECT deleted FROM polls WHERE id='${pollId}'`),'t');
 assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 fs.writeFileSync(resultFile,JSON.stringify({date:new Date().toISOString(),imageId:image,passed:true,nativeMigrations:true,nativePasswordSetupAndLogin:true,twoIndependentAccounts:true,nativePollCreated:true,fictionalInviteRendered:true,guestVoteSaved:true,reloadPersistence:true,otherAccountAndGuestDeleteDenied:true,ownerDeleteAllowed:true,fictionalDataOnly:true,network:'internal; no external browser origins',limitations:['Approved synthetic account/space and reset-token rows were seeded in disposable PostgreSQL; native password creation/sign-in and app permissions then exercised. No email delivery or production OIDC check.']},null,2)+'\n');
 console.log('Rallly: native two-account login, poll create, guest vote, reload, cross-account denial and owner deletion passed.');
}catch(e){fs.writeFileSync(dir+'/application-error.txt',String(e.stderr||e.stack||e));if(lastPage)try{fs.writeFileSync(dir+'/application-page.txt',await lastPage.locator('body').innerText());}catch{}throw Error('Rallly candidate failed; private synthetic diagnostics retained.');}
finally{if(browser)await browser.close();if(bridge?.pid)try{process.kill(-bridge.pid,'SIGTERM');}catch{}for(const name of [app,db])try{docker('rm','-f','-v',name);}catch{}try{docker('network','rm',network);}catch{}}
