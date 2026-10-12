// Adapt matching Debian packaging to the native amd64 Bookworm dependency ABI.
// No curl security logic is reimplemented. Every source patch remains upstream.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2];
assert(root && fs.existsSync(root+'/debian/control'));
const replace=(s,from,to)=>{assert(from instanceof RegExp?from.test(s):s.includes(from),`Missing packaging anchor: ${from}`);return s.replace(from,to);};
let c=fs.readFileSync(root+'/debian/control','utf8');
c=replace(c,/Package: libcurl3t64-gnutls\n[\s\S]*?(?=Package: libcurl4-openssl-dev\n)/,'');
c=replace(c,'               dpkg-dev (>= 1.22.5),','               dpkg-dev (>= 1.21.22),');
c=replace(c,'Provides: ${t64:Provides},\nX-Time64-Compat: libcurl4\nBreaks: libcurl4 (<< ${source:Version}),\n','');
c=replace(c,'Breaks: libcurl3t64-gnutls (<< 8.20.0-3~)\nReplaces: libcurl3t64-gnutls (<< 8.20.0-3~)\n','');
c=replace(c,'Replaces: libcurl3,\n          libcurl4,','Replaces: libcurl3,');
c=c.replace(/^ +libng(?:http3|tcp2)[^\n]+\n/gm,'');
c=c.replace(/^Depends: libnghttp3-9[^\n]+\n/gm,'Depends:');
c=c.replace(/libldap-dev/g,'libldap2-dev');
c=c.replace(/RTMP, /g,'');
assert(!/t64:|libnghttp3|libngtcp2/.test(c));
fs.writeFileSync(root+'/debian/control',c);
const rename=s=>s.replace(/libcurl4t64/g,'libcurl4').replace(/libcurl4-gnutls(?!-dev)/g,'libcurl3-gnutls');
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())walk(p);else if(e.isFile()){const old=fs.readFileSync(p,'utf8');const updated=rename(old);if(old!==updated)fs.writeFileSync(p,updated);const q=d+'/'+rename(e.name);if(p!==q){assert(!fs.existsSync(q));fs.renameSync(p,q);}}}};
walk(root+'/debian');
let rules=fs.readFileSync(root+'/debian/rules','utf8');
rules=replace(rules,'\t--with-ngtcp2 --with-nghttp3\t\\','\t--without-ngtcp2 --without-nghttp3\t\\');
fs.writeFileSync(root+'/debian/rules',rules);
// Retain the native compatibility alias present in Bookworm's original package.
fs.writeFileSync(root+'/debian/libcurl3-gnutls.links','usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.4 usr/lib/x86_64-linux-gnu/libcurl-gnutls.so.3\n');
console.log('Native Bookworm package names, dependencies and legacy alias prepared.');
