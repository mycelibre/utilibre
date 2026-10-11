// Run before enabling the gateway. Native account creation only; no public signup.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const dir='/opt/utilibre/records/private';
const auth=dir+'/grist-auth.env';
// OAuth2 Proxy expects URL-safe base64 (the original bytes are preserved).
const env=readFileSync(auth,'utf8');
writeFileSync(auth,env.replace(/^(OAUTH2_PROXY_COOKIE_SECRET=)(.+)$/m,(_,k,v)=>k+Buffer.from(v,'base64').toString('base64url')),{mode:0o600});
execFileSync('docker',['exec','-i','-w','/app/backend','utilibre-records-candlr-1','python','-'],{input:`
from app.database import SessionLocal
from app.models import User
from app.seed import seed_default_event_types
with SessionLocal() as db:
    owner=db.query(User).filter(User.email=='admin@utilibre.org').first()
    if not owner:
        if db.query(User).count():
            raise RuntimeError('Unexpected users before first-owner bootstrap')
        owner=User(username='admin',email='admin@utilibre.org',is_admin=True,hashed_password=None)
        db.add(owner); db.commit(); db.refresh(owner)
        seed_default_event_types(db,owner.id)
    assert owner.is_admin
`,stdio:['pipe','ignore','pipe']});
const ownerPath=dir+'/bookplate-owner.json';
if(!existsSync(ownerPath)) {
 const owner={name:'Utilibre administrator',email:'admin@utilibre.org',password:randomBytes(36).toString('base64url')};
 // Persist before the request so a transport interruption cannot lose the password.
 writeFileSync(ownerPath,JSON.stringify(owner),{flag:'wx',mode:0o600});
 const result=await fetch('http://172.29.158.13:3000/api/auth/sign-up/email',{
  method:'POST',headers:{'Content-Type':'application/json','Origin':'https://bookplate.utilibre.org','X-Forwarded-Host':'bookplate.utilibre.org','X-Forwarded-Proto':'https'},body:JSON.stringify(owner)
 });
 if(!result.ok)throw Error('Bookplate owner creation failed: HTTP '+result.status+'; private credentials retained for recovery');
}
console.log('Owner bootstrap completed; credentials remain in root-only private storage.');
