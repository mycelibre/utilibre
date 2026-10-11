// Bounded same-application Debian security refresh. Staging shares ONLY the
// existing RSS-Bridge network namespace (and thus its egress restrictions),
// with separate processes, read-only code and disposable memory-only cache.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const exec=promisify(execFile),root='/home/ubuntu/freetools';
const dir='/var/lib/utilibre-maintenance/rssbridge-20261011';
const production='utilibre-community-rssbridge-1',stage='utilibre-maintenance-rssbridge-stage';
const candidate='utilibre-rssbridge:2025-08-05-security-20261011';
const old='rssbridge/rss-bridge:2025-08-05@sha256:569f01f3faecd0d34d702e01b34eb0a769f7bedb84caf6dff29821d18b46f971';
const live=process.argv[2]==='live';
if(!live&&process.argv[2]!=='stage')throw Error('Use stage or live');
await mkdir(dir,{recursive:true,mode:0o700});
async function docker(args,timeout=20000){return (await exec('docker',args,{timeout,maxBuffer:2*1024**2})).stdout;}
const hashScript='cd /app && find . -path ./cache -prune -o -type f ! -name config.ini.php -print0 | sort -z | xargs -0 sha256sum | sha256sum';
const hash=async image=>(await docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--cpus','.5','--entrypoint','sh',image,'-c',hashScript])).trim().split(/\s+/)[0];
const before=await hash(old),after=await hash(candidate);
if(!/^[a-f0-9]{64}$/.test(before)||before!==after)throw Error('Application bytes changed');
const identity=JSON.parse(await docker(['image','inspect',candidate]))[0].Id;
const config=root+'/deployment/community/';let created=false;
try{
 if(!live){
  const nginx=(await readFile(config+'rssbridge-nginx.conf','utf8')).replace('listen 8080;','listen 127.0.0.1:8088;');
  await writeFile(dir+'/nginx.conf',nginx,{mode:0o644});
  await docker(['run','-d','--name',stage,'--network','container:'+production,'--read-only','--user','33:33','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','.5','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=32m,mode=1777','--tmpfs','/run:rw,nosuid,nodev,noexec,size=16m,mode=1777','--tmpfs','/app/cache:rw,nosuid,nodev,noexec,size=128m,uid=33,gid=33','-v',config+'rssbridge.ini.php:/app/config.ini.php:ro','-v',config+'rssbridge-fpm.conf:/etc/php/8.2/fpm/utilibre.conf:ro','-v',dir+'/nginx.conf:/etc/nginx/utilibre.conf:ro','--entrypoint','sh',candidate,'-ec','mkdir -p /run/php; nginx -c /etc/nginx/utilibre.conf; exec php-fpm8.2 --fpm-config /etc/php/8.2/fpm/utilibre.conf --nodaemonize']);
  created=true;
 }else if(JSON.parse(await docker(['inspect',production]))[0].Image!==identity)throw Error('Live image does not match candidate');
 const name=live?production:stage,port=live?8080:8088;
 await docker(['exec',name,'nginx','-t','-c','/etc/nginx/utilibre.conf']);
 await docker(['exec',name,'php-fpm8.2','-t','--fpm-config','/etc/php/8.2/fpm/utilibre.conf']);
 const php=`$s=file_get_contents('http://127.0.0.1:${port}/?action=display&bridge=GithubTrendingBridge&context=By+language&language=&format=Atom');$x=new SimpleXMLElement($s);$x->registerXPathNamespace('a','http://www.w3.org/2005/Atom');$n=count($x->xpath('/a:feed/a:entry'));if($n<1)exit(1);echo json_encode(['atomEntries'=>$n]);`;
 const feed=JSON.parse(await docker(['exec',name,'php','-r',php],50000));
 // Exact, harmless connection probes; no metadata body or credentials requested.
 const boundary=`foreach(['http://10.10.1.3/','http://169.254.169.254/','http://[fd00::1]/'] as $u){$c=curl_init($u);curl_setopt_array($c,[CURLOPT_NOBODY=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>2,CURLOPT_PROXY=>'']);$r=curl_exec($c);if($r!==false)exit(1);curl_close($c);}echo 'blocked';`;
 if((await docker(['exec',name,'php','-r',boundary],10000))!=='blocked')throw Error('Unexpected internal connectivity');
 const packages=await docker(['exec',name,'dpkg-query','-W','-f','${Package}\t${Version}\n']);
 await writeFile(dir+'/packages.txt',packages,{mode:0o600});
 const result={date:new Date().toISOString(),status:'passed',mode:live?'live':'stage',candidate,image:identity,appSha256:after,feed,nativeConfiguration:'passed',privateIPv4MetadataIPv6:'blocked',limitations:['One curated connector, not every source; upstream availability may change.','Application code unchanged; Debian packages refreshed and separately scanned.']};
 await writeFile(dir+(live?'/release.json':'/stage.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(result));
}finally{if(created)await docker(['rm','-f',stage]);}
