// Fictional two-account fixtures in the already-isolated blank test database.
// Direct SQL supplies membership/role fixtures; removal and permission checks
// use the native API. This is not an email-invitation delivery test.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const directory=process.argv[2];
assert.match(directory,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const metadata=JSON.parse(await readFile(directory+'/metadata.json','utf8'));
assert.equal(metadata.report,directory);assert.equal(metadata.version,'2.18.3');
const [container]=JSON.parse(execFileSync('docker',['inspect',metadata.name+'-penpot-db-1']));
assert.equal(container.Config.Labels['com.docker.compose.project'],metadata.name);
assert(container.Mounts.every(x=>!x.Source?.startsWith('/opt/utilibre/expanded-data')));
const [network]=JSON.parse(execFileSync('docker',['network','inspect',metadata.name+'_isolated']));assert.equal(network.Internal,true);
const accounts=JSON.parse(await readFile(directory+'/checker-accounts.json','utf8'));
assert.equal(accounts.length,2);const [owner,member]=accounts;
const uuid=value=>{assert.match(value,/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);return value;};
const memberId=uuid(member.profile.id);
async function rpc(method,body,account,status=200){
 const response=await fetch(`http://127.0.0.1:${metadata.port}/api/main/methods/${method}`,{method:'POST',headers:{accept:'application/json','content-type':'application/json',cookie:`auth-token=${account.cookie}`},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,status,method+' HTTP status');const text=await response.text();return text?JSON.parse(text):null;
}
const sql=query=>execFileSync('docker',['exec','-i',metadata.name+'-penpot-db-1','psql','-U','penpot','-d','penpot','-v','ON_ERROR_STOP=1','-At'],{input:query,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']});
const unaffected=await rpc('create-file',{name:'Fictional unrelated private work',projectId:member.profile.defaultProjectId},member);
for(const action of ['remove','leave']){
 const team=await rpc('create-team',{name:'Fictional membership '+action},owner);
 const teamId=uuid(team.id),projectId=uuid(team.defaultProjectId);
 const file=await rpc('create-file',{name:'Fictional permission check',projectId},owner);const fileId=uuid(file.id);
 sql(`INSERT INTO team_profile_rel (team_id,profile_id,can_edit) VALUES ('${teamId}','${memberId}',true);
 INSERT INTO project_profile_rel (project_id,profile_id,can_edit) VALUES ('${projectId}','${memberId}',true);
 INSERT INTO file_profile_rel (file_id,profile_id,can_edit) VALUES ('${fileId}','${memberId}',true);`);
 assert.equal((await rpc('get-file',{id:fileId},member)).id,fileId);
 if(action==='remove')await rpc('delete-team-member',{teamId,memberId},owner,204);
 else await rpc('leave-team',{id:teamId},member,204);
 await rpc('get-file',{id:fileId},member,404);
 assert.equal((await rpc('get-file',{id:fileId},owner)).id,fileId);
 assert.equal((await rpc('get-file',{id:unaffected.id},member)).id,unaffected.id);
 assert.equal(sql(`SELECT (SELECT COUNT(*) FROM team_profile_rel WHERE team_id='${teamId}' AND profile_id='${memberId}') + (SELECT COUNT(*) FROM project_profile_rel WHERE project_id='${projectId}' AND profile_id='${memberId}') + (SELECT COUNT(*) FROM file_profile_rel WHERE file_id='${fileId}' AND profile_id='${memberId}');`).trim(),'0');
 // Simulate a legacy orphan relation: authorization must fail even before the
 // migration or cleanup removes it. No production row is queried or changed.
 sql(`INSERT INTO file_profile_rel (file_id,profile_id,can_edit) VALUES ('${fileId}','${memberId}',true);`);
 await rpc('get-file',{id:fileId},member,404);
 sql(`DELETE FROM file_profile_rel WHERE file_id='${fileId}' AND profile_id='${memberId}';`);
 await rpc('delete-file',{id:fileId},owner,204);
 await rpc('delete-team',{id:teamId},owner,204);
}
await rpc('delete-file',{id:unaffected.id},member,204);
const result={date:new Date().toISOString(),version:'2.18.3',status:'passed',checks:['native member removal revokes file access','native voluntary leave revokes file access','team-scoped role rows removed','legacy orphan role cannot regain file access','owner and unrelated private work remain accessible'],scope:'Two fictional accounts; membership setup uses isolated database fixtures. No real account, invitations, production data or external requests.'};
await writeFile(directory+'/membership.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
