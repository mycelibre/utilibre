// Only the exact completed vendor-binary release; raw Debian metadata stays visible.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
import {eligible,prove,binarySha256} from './nginx-debian-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/nginx-debian',read=p=>JSON.parse(fs.readFileSync(p));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const b=read(dir+'/rssbridge/build.json'),a=read(dir+'/rssbridge/application.json'),v=read(dir+'/rssbridge/inventory.json'),gate=read(dir+'/rssbridge/scan-gate.json');prove(b,a,v,gate);
const release=read(dir+'/release.json');assert.equal(release.status,'passed');assert.equal(release.groups.length,1);
const g=release.groups[0];assert(g.status==='passed'&&Date.parse(g.completedAt)<=Date.parse(scan.completedAt));
assert.equal(g.rows[0].newImage,b.imageId);assert.equal(g.rows[0].oldImage,b.base);
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const name='utilibre-community-rssbridge-1',c=JSON.parse(docker('inspect',name))[0];assert(c.State.Running&&c.Image===b.imageId&&c.Config.User==='33:33');
assert(!c.Mounts.some(m=>m.Destination==='/usr/sbin/nginx'||'/usr/sbin/nginx'.startsWith(m.Destination+'/')));
assert.equal(docker('exec',name,'sha256sum','/usr/sbin/nginx').split(' ')[0],binarySha256);
assert.equal(docker('exec',name,'sh','-c','nginx -v 2>&1'),'nginx version: nginx/1.30.6');
for(const [n,h]of Object.entries(a.configSha256))assert.equal(createHash('sha256').update(fs.readFileSync('/home/ubuntu/freetools/deployment/community/'+n)).digest('hex'),h);
const decisions=[];
for(const i of queue.items.filter(eligible)){
 assert.equal(i.artifact,b.imageId);assert.equal(docker('exec',name,'dpkg-query','-W','-f=${Version}',i.package),i.installed);
 decisions.push(validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact running RSS-Bridge NGINX is the official signed Debian 12 stable 1.30.6 executable, SHA256 '+binarySha256+'. Upstream lists all three reviewed advisories fixed in 1.30.6. Debian nginx/nginx-common labels are deliberately unchanged, not relabelled to clear the scanner. Complete image comparison permits only /usr/sbin/nginx and its retained vendor license; PHP, configuration, prior library repairs and application files are unchanged. Old/new native PHP-FPM, headers, methods, private paths, rate limit, HTTP/2 and fictional Atom feed pass; same-database scan adds no high/critical record. Completed image/health/route gate verified. This is vendor-fixed-byte and compatibility evidence, not an exploit reproduction or blanket nginx clearance. Evidence: security-20261028/nginx-debian/rssbridge/; https://nginx.org/en/security_advisories.html'}));
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
const path=dir+'/review-'+Date.now()+'.json';fs.writeFileSync(path,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,decisions,imageId:b.imageId,binarySha256,productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,report:path,applied:false}));
