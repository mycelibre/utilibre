import {readFileSync,writeFileSync} from 'node:fs';
const path='/opt/utilibre/records/private/bookplate.env';
const data=readFileSync(path,'utf8');
if(!/^REGISTRATION=(open|closed)$/m.test(data)||!/^SMTP_HOST=.*$/m.test(data))throw Error('Unexpected configuration');
writeFileSync(path,data.replace(/^REGISTRATION=.*$/m,'REGISTRATION=closed').replace(/^SMTP_HOST=.*$/m,'SMTP_HOST=mx.mailgt.dev'),{mode:0o600});
console.log('Bookplate: native registration closed; existing SMTP relay configured. No credentials printed.');
