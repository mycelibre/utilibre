// Explicitly synthetic native account, no enrollment or changes to existing users.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const file='/opt/utilibre/pack-secrets/freshrss-check.json';
let account;
try { account=JSON.parse(await readFile(file,'utf8')); }
catch(e) { if(e.code!=='ENOENT')throw e; account={username:'pack_check_20261008',password:randomBytes(32).toString('base64url')};await writeFile(file,JSON.stringify(account),{mode:0o600,flag:'wx'}); }
const php=`require 'cli/_cli.php';
$a=json_decode(stream_get_contents(STDIN),true);
if(in_array($a['username'],FreshRSS_user_Controller::listUsers())) {echo "Synthetic account already exists.\\n";exit;}
$ok=FreshRSS_user_Controller::createUser($a['username'],null,$a['password'],['language'=>'en'],false);
if(!$ok)exit(1);
accessRights();echo "Synthetic native account created; no subscriptions added.\\n";`;
const result=execFileSync('docker',['exec','-i','utilibre-services-freshrss-1','php','-r',php],{input:JSON.stringify(account),encoding:'utf8'});
if(account.username!=='pack_check_20261008')throw Error('Unexpected test account');
// Apply the native documented group permissions only to this test account.
const directory='data/users/pack_check_20261008';
execFileSync('docker',['exec','utilibre-services-freshrss-1','chown','-R',':www-data',directory]);
execFileSync('docker',['exec','utilibre-services-freshrss-1','chmod','-R','g+rwX',directory]);
console.log(result.trim());
