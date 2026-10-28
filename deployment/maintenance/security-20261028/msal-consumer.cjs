// Real installed Azure SDK and Kuma monitor; only synthetic transport/database.
const assert=require('node:assert/strict'),{createRequire}=require('node:module');
const appRequire=createRequire('/app/package.json');
(async()=>{
 const tenant='00000000-0000-0000-0000-000000000002',client='00000000-0000-0000-0000-000000000001',host='login.microsoftonline.com',authority=`https://${host}/${tenant}`,requests=[];
 const {ClientSecretCredential}=appRequire('@azure/identity'),{createHttpHeaders}=appRequire('@azure/core-rest-pipeline');
 const httpClient={async sendRequest(request){
  const u=new URL(request.url);assert.equal(u.hostname,host);requests.push({method:request.method,path:u.pathname});
  const body=request.method==='POST'?{access_token:'fictional-azure-token',token_type:'Bearer',expires_in:3600,scope:'https://database.windows.net/.default'}:
   u.pathname.includes('discovery/instance')?{tenant_discovery_endpoint:authority+'/v2.0/.well-known/openid-configuration',metadata:[{preferred_network:host,preferred_cache:host,aliases:[host]}]}:
   {authorization_endpoint:authority+'/oauth2/v2.0/authorize',token_endpoint:authority+'/oauth2/v2.0/token',issuer:authority+'/v2.0',jwks_uri:authority+'/discovery/v2.0/keys'};
  return {request,status:200,headers:createHttpHeaders({'content-type':'application/json'}),bodyAsText:JSON.stringify(body)};
 }};
 const credential=new ClientSecretCredential(tenant,client,'fictional-secret',{httpClient,disableInstanceDiscovery:true});
 const token=await credential.getToken('https://database.windows.net/.default');assert.equal(token.token,'fictional-azure-token');assert(token.expiresOnTimestamp>Date.now());
 assert(requests.some(r=>r.method==='POST'));const before=requests.length;assert.equal((await credential.getToken('https://database.windows.net/.default')).token,token.token);assert.equal(requests.length,before);
 // Preserve native driver's module loading and the monitor's supported
 // query/error/cleanup path without connecting to any SQL server.
 const mssql=appRequire('mssql'),original=mssql.ConnectionPool;let closed=0,rows=[{fictional:1}],query,fail=false;
 mssql.ConnectionPool=class{async connect(){if(fail)throw Error('fictional connection failure');return this;}request(){return {query:async sql=>{query=sql;return {recordset:rows};}};}async close(){closed++;}};
 try{
  const {MssqlMonitorType}=appRequire('./server/monitor-types/mssql'),monitor=new MssqlMonitorType,heartbeat={};
  await monitor.check({databaseConnectionString:'Server=fictional.invalid',databaseQuery:'',conditions:null},heartbeat,{});assert.equal(query,'SELECT 1');assert.equal(heartbeat.status,1);assert.equal(heartbeat.msg,'Rows: 1');
  assert.equal(await monitor.mssqlQuerySingleValue('fictional','SELECT 1'),1);
  rows=[];await assert.rejects(monitor.mssqlQuerySingleValue('fictional','SELECT 1'),/no results/);
  fail=true;await assert.rejects(monitor.check({databaseConnectionString:'fictional'}, {}, {}),/fictional connection failure/);assert.equal(closed,4);
 }finally{mssql.ConnectionPool=original;}
 console.log(JSON.stringify({passed:true,azureCredential:true,azureTokenCache:true,nativeMssqlModule:true,monitorChecks:4,network:false,realCredentials:false,limitation:'Azure HTTP and SQL transport are synthetic; no real Microsoft tenant, database or production monitor was queried.'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
