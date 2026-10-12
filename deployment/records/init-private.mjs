// Local secret/config generation; never print values or overwrite an existing deployment.
import {mkdirSync,writeFileSync,readFileSync,existsSync,chownSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
process.umask(0o077);
const root='/opt/utilibre/records';
mkdirSync(root,{recursive:true});
mkdirSync(root+'/private',{recursive:true});
mkdirSync(root+'/backups',{recursive:true});
for(const [name,uid] of [['grist',1000],['candlr',1000],['bookplate',1000],['postgresql',70]]) {
  const path=root+'/data/'+name; mkdirSync(path,{recursive:true}); chownSync(path,uid,uid);
}
const key=()=>randomBytes(32).toString('hex');
const oidc=(id)=>JSON.parse(readFileSync('/opt/utilibre/identity-data/data/private/'+id+'-oidc.json','utf8'));
function save(name,values) {
  const path=root+'/private/'+name+'.env';
  if(existsSync(path))throw Error('Refusing to replace existing '+name+' configuration');
  writeFileSync(path,Object.entries(values).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx',mode:0o600});
}
const db=key();
save('database',{POSTGRES_USER:'bookplate',POSTGRES_DB:'bookplate',POSTGRES_PASSWORD:db,POSTGRES_INITDB_ARGS:'--auth-host=scram-sha-256'});
save('grist',{
 APP_HOME_URL:'https://grist.utilibre.org',GRIST_IN_SERVICE:'true',GRIST_FORCE_LOGIN:'true',
 GRIST_FORWARD_AUTH_HEADER:'X-Forwarded-Email',GRIST_IGNORE_SESSION:'true',
 GRIST_FORWARD_AUTH_LOGOUT_PATH:'/oauth2/sign_out',GRIST_SESSION_SECRET:key(),
 GRIST_DEFAULT_EMAIL:'admin@utilibre.org',GRIST_TELEMETRY_LEVEL:'off',
 GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING:'false',GRIST_SUPPORT_ANON:'false',
 GRIST_HIDE_UI_ELEMENTS:'helpCenter,billing,templates,createSite,multiSite,multiAccounts,importFromAirtable,sendToDrive,tutorials,supportGrist,automations',
 GRIST_SANDBOX_FLAVOR:'pyodide',GRIST_PYODIDE_SKIP_DENO:'0',GRIST_SANDBOX:'/usr/local/bin/grist-deno',GRIST_MAX_UPLOAD_IMPORT_MB:'10',GRIST_MAX_UPLOAD_ATTACHMENT_MB:'5',
 GRIST_MAX_PARALLEL_REQUESTS_PER_DOC:'5',GRIST_WIDGET_LIST_URL:'',GRIST_LOG_LEVEL:'error',
 GRIST_ENABLE_REQUEST_FUNCTION:'false',GRIST_ENABLE_SERVICE_ACCOUNTS:'false',
 GRIST_ENABLE_SCIM:'false',GRIST_ENABLE_OIDC_SERVER:'false',GRIST_ENABLE_OIDC_DCR:'false',
 GRIST_ENABLE_USER_PRESENCE:'true',GRIST_MCP_ENABLED:'false',ALLOWED_WEBHOOK_DOMAINS:'',
});
save('grist-auth',{
 OAUTH2_PROXY_CLIENT_ID:oidc('grist').client_id,OAUTH2_PROXY_CLIENT_SECRET:oidc('grist').client_secret,
 OAUTH2_PROXY_COOKIE_SECRET:randomBytes(32).toString('base64url')
});
save('candlr',{
 SECRET_KEY:key(),COOKIE_SECURE:'true',ENABLE_REGISTRATIONS:'false',DOCS_ENABLED:'false',
 BACKEND_PORT:'8000',SERVER_URL:'https://candlr.utilibre.org',TIMEZONE:'America/Guatemala',
 OIDC_ENABLED:'true',OIDC_PROVIDER_NAME:'Utilibre',OIDC_CLIENT_ID:oidc('candlr').client_id,
 OIDC_CLIENT_SECRET:oidc('candlr').client_secret,
 OIDC_AUTH_URL:'https://auth.utilibre.org/application/o/authorize/',
 OIDC_TOKEN_URL:'https://auth.utilibre.org/application/o/token/',
 OIDC_USERINFO_URL:'https://auth.utilibre.org/application/o/userinfo/',
 OIDC_REDIRECT_URL:'https://candlr.utilibre.org/oidc-callback',
 OIDC_AUTO_CREATE_USERS:'true',OIDC_DISABLE_PASSWORD_LOGIN:'true',
 SMTP_ADDRESS:'mx.mailgt.dev',SMTP_PORT:'26',SMTP_ENCRYPTION:'tls',FROM_EMAIL:'no-reply@utilibre.org',
 CARDDAV_SYNC_INTERVAL_MINUTES:'0',UTILIBRE_DISABLE_UPDATE_CHECK:'true'
});
save('bookplate',{
 DATABASE_URL:'postgres://bookplate:'+db+'@172.29.158.14:5432/bookplate',
 AUTH_SECRET:key(),PUBLIC_URL:'https://bookplate.utilibre.org',REGISTRATION:'closed',
 SIGNUP_BOT_CHECK:'false',STORAGE:'local',UPLOADS_DIR:'/data/uploads',
 LIMIT_BOOKS:'1000',LIMIT_WORDS:'5000',LIMIT_STORAGE_MB:'100',LIMIT_UPLOAD_MB:'5',LIMIT_IMPORT_MB:'25',
 LOG_LEVEL:'error',NEWSLETTER:'false',NEXT_TELEMETRY_DISABLED:'1',
 PRIVACY_URL:'https://utilibre.org/en/privacy',TERMS_URL:'https://utilibre.org/en/acceptable-use',
 SMTP_HOST:'',SMTP_PORT:'26',SMTP_SECURE:'false',SMTP_FROM:'no-reply@utilibre.org',
 SMTP_REPLY_TO:'admin@utilibre.org',EMAIL_LIMIT_PER_DAY:'50',CONTACT_EMAIL:'admin@utilibre.org',
 NODE_USE_ENV_PROXY:'1',HTTP_PROXY:'http://172.29.158.20:3128',HTTPS_PROXY:'http://172.29.158.20:3128',
 NO_PROXY:'127.0.0.1,localhost,172.29.158.14'
});
console.log('Private configuration generated; no credentials printed.');
