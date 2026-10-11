// One-time reviewed migration to coturn 4.18. Reuse all credentials, ACLs,
// budgets and certificates. This removes only two upstream-removed no-* flags.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const mode=process.argv[2], image='utilibre-coturn:4.18.0-security-20261011';
const choices={pairdrop:{file:'/opt/utilibre/turn/turnserver.conf',compose:'deployment/community/compose.turn.yaml',args:['--profile','public-turn']},galene:{file:'/opt/utilibre/pack-data/galene-turn/turnserver.conf',compose:'deployment/pack/compose.galene-turn.yaml',args:[]}};
if(!Object.hasOwn(choices,mode))throw Error('Choose pairdrop or galene');
const r=choices[mode],dir='/var/lib/utilibre-maintenance/coturn-20261011';
await mkdir(dir,{recursive:true,mode:0o700});
const before=await readFile(r.file,'utf8');
if(/^(?:cli|dtls|web-admin)(?:=|$)/m.test(before))throw Error('Unexpected enabled management/DTLS feature');
const after=before.replace(/^(?:no-cli|no-dtls)\r?\n/gm,'');
if(before===after)throw Error('Already migrated; inspect release record');
await copyFile(r.file,dir+'/'+mode+'.conf.before');
const compose=['compose','-f',r.compose,...r.args];
// Parse configuration in memory without echoing secrets.
const cfg=JSON.parse(execFileSync('docker',[...compose,'config','--format','json'],{encoding:'utf8'}));
if(cfg.services.turn.image!==image)throw Error('Candidate pin mismatch');
await writeFile(r.file,after); // preserves existing ownership/mode
try{
 execFileSync('docker',[...compose,'up','-d','--no-build','--pull','never','turn'],{stdio:'ignore'});
 await writeFile(dir+'/'+mode+'-release.json',JSON.stringify({date:new Date().toISOString(),image,removedFlags:['no-cli','no-dtls'],configurationOtherwiseUnchanged:true})+'\n',{mode:0o600});
 console.log(mode+': candidate started; native security and transfer verification required.');
}catch(error){
 await writeFile(r.file,before);
 const rollback=dir+'/'+mode+'-rollback.json';
 await writeFile(rollback,JSON.stringify({services:{turn:{image:'utilibre-coturn:4.7.0-p1'}}}),{mode:0o600});
 execFileSync('docker',[...compose,'-f',rollback,'up','-d','--no-build','--pull','never','turn'],{stdio:'ignore'});
 throw Error('Previous runtime/config restored; source pin needs reconciliation.');
}
