// Read-only native-package checks; never installs a package or executes commands
// through sudo. Test-only environment helpers are compiled as an ordinary user.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const suite=process.argv[2];assert(['trixie','bookworm'].includes(suite));
const version=suite==='trixie'?'1.9.16p2-3+deb13u2':'1.9.13p3-1+deb12u4';
const task='/var/lib/utilibre-maintenance/sudo-followup-20261012';
const out=`${task}/${suite}/output`, builder=`maintenance-sudo-${suite}-build`;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',timeout:120000,maxBuffer:8e6,stdio:['ignore','pipe','pipe']});
const dex=args=>run('docker',['exec',builder,...args]);
const source=fs.readFileSync(out+'/repaired-sudo.c','utf8');
const vendor=fs.readFileSync(out+'/vendor-sudo.c','utf8');
function fn(name,code=source){const p=code.indexOf(`\n${name}(`);assert(p>0,name);const end=code.indexOf('\n}',p);assert(end>p);return code.slice(p+1,end+2);}
assert(!vendor.includes('\nset_time_zone('));
assert(source.indexOf('    os_init(argc, argv, envp);')<source.indexOf('    set_time_zone();'));
assert(source.indexOf('    set_time_zone();')<source.indexOf('    sudo_check_suid('));
assert(fn('set_time_zone').includes('unsetenv("TZ");'));
assert(fn('os_init_common').includes('environ = new_env;'));
const originalPatch=fs.readFileSync(task+'/sources/db669167ca599f2a94cd8a4c5fae9e473c81a2fd.patch','utf8');
const usedPatch=fs.readFileSync(`${task}/${suite}/work/source/debian/patches/utilibre-db669167ca599f2a94cd8a4c5fae9e473c81a2fd.patch`,'utf8');
assert.equal(usedPatch,suite==='bookworm'?originalPatch.replace('     return EXIT_FAILURE;','     exit(EXIT_FAILURE);'):originalPatch);
assert.equal(sha(`${task}/${suite}/work/source/debian/patches/utilibre-1820a349687522f51023d1ae5925125f59679a8c.patch`),sha(task+'/sources/1820a349687522f51023d1ae5925125f59679a8c.patch'));
const c=`#define _GNU_SOURCE
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#define GC_PTR 1
#define U_(s) (s)
#define sudo_fatalx_nodebug(...) abort()
static void gc_init(void) {}
static bool gc_add(int kind, void *p) { return kind == GC_PTR && p != NULL; }
static void ${fn('set_time_zone')}
int ${fn('os_init_common')}
int main(void) {
  extern char **environ;
  assert(getuid() != 0 && geteuid() != 0);
  char env0[]="TZ=UTC+01", env1[]="TEST_SENTINEL=retained";
  char *original[]={env0,env1,NULL};
  char *argv[]={"native-sudo-environment-check",NULL};
  unsetenv("TZ"); tzset();
  struct tm plain={.tm_year=126,.tm_mon=0,.tm_mday=15,.tm_hour=12,.tm_isdst=-1};
  time_t expected=mktime(&plain);
  environ=original;
  assert(os_init_common(1,argv,original)==0);
  assert(environ!=original);
  set_time_zone();
  assert(getenv("TZ")==NULL);
  assert(strcmp(getenv("TEST_SENTINEL"),"retained")==0);
  assert(strcmp(original[0],"TZ=UTC+01")==0 && original[2]==NULL);
  struct tm observed={.tm_year=126,.tm_mon=0,.tm_mday=15,.tm_hour=12,.tm_isdst=-1};
  assert(mktime(&observed)==expected);
  char *empty[]={NULL}; environ=empty;
  assert(os_init_common(1,argv,empty)==0); set_time_zone();
  assert(environ[0]==NULL);
  puts("SUDO_ENVIRONMENT_HELPERS_PASSED: non-root, original plugin env retained, working TZ removed, local conversion stable, empty env accepted");
  return 0;
}
`;
fs.writeFileSync(out+'/timezone-native.c',c,{mode:0o644});
dex(['cc','-std=c11','-O2','-Wall','-Wextra','-Wno-unused-parameter','/output/timezone-native.c','-o','/output/timezone-native']);
const helper=dex(['runuser','-u','nobody','--','/output/timezone-native']).trim();assert(helper.includes('SUDO_ENVIRONMENT_HELPERS_PASSED'));
const candidate=`${out}/sudo_${version}+utilibre1_amd64.deb`, baseline=`${task}/sources/sudo_${version}_amd64.deb`;
const packageProof=fs.mkdtempSync(out+'/package-check-');
for(const [name,file]of [['baseline',baseline],['candidate',candidate]]){
 const dir=packageProof+'/'+name;
 run('dpkg-deb',['--raw-extract',file,dir]);
}
function files(root,prefix=''){let result=[];for(const entry of fs.readdirSync(root,{withFileTypes:true})){const p=prefix+'/'+entry.name;if(entry.isDirectory())result.push(...files(root+'/'+entry.name,p));else result.push(p);}return result.sort();}
const before=packageProof+'/baseline', after=packageProof+'/candidate';
assert.deepEqual(files(before+'/etc'),files(after+'/etc'));
const configs=files(before+'/etc').map(p=>{assert.equal(sha(before+'/etc'+p),sha(after+'/etc'+p),p);return p;});
function elf(p){const buf=fs.readFileSync(p);return buf.subarray(0,4).equals(Buffer.from([127,69,76,70]));}
const binaries=files(before).filter(p=>!fs.lstatSync(before+p).isSymbolicLink()&&elf(before+p));
const abi=[];
function needed(p){return [...run('readelf',['-d',p]).matchAll(/\(NEEDED\).*?\[(.*?)\]/g)].map(m=>m[1]).sort();}
function exports(p){return run('nm',['-D','--defined-only',p]).split('\n').map(s=>s.trim().split(/\s+/).at(-1)).filter(Boolean).sort();}
for(const p of binaries){
 assert(fs.existsSync(after+p),p);assert.deepEqual(needed(before+p),needed(after+p),p+' dependencies');
 assert.deepEqual(exports(before+p),exports(after+p),p+' exports');
 assert.equal(fs.statSync(before+p).mode&0o7777,fs.statSync(after+p).mode&0o7777,p+' file mode');
 abi.push({path:p,sha256:sha(after+p),needed:needed(after+p),exports:exports(after+p).length});
}
const scripts=['preinst','postinst','prerm','postrm'].filter(p=>fs.existsSync(before+'/DEBIAN/'+p));
for(const name of scripts){
 const clean=p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>!l.trim().startsWith('#')).join('\n').trim();
 assert.equal(clean(before+'/DEBIAN/'+name),clean(after+'/DEBIAN/'+name),name+' maintainer script');
}
const build=fs.readFileSync(out+'/build.log','utf8');assert(build.includes('override_dh_auto_test'));
// Compiler warning context can quote a test's literal "FAIL:" branch even
// when the executed test passes. Validate actual anchored result summaries.
const upstreamResults=[...build.matchAll(/^([\w_]+): (\d+) tests run, (\d+) errors, (\d+)% success rate$/gm)].map(m=>({name:m[1],tests:Number(m[2]),errors:Number(m[3]),success:Number(m[4])}));
assert(upstreamResults.length>50);
for(const result of upstreamResults){assert.equal(result.errors,0,result.name);assert.equal(result.success,100,result.name);}
for(const name of ['sudoers','testsudoers','visudo','cvtsudoers'])assert.equal(upstreamResults.filter(r=>r.name===name).length,2,`${name}: simple and LDAP builds`);
assert(fs.readFileSync(out+'/runner.log','utf8').includes('NATIVE_SUDO_BUILD_PASSED'));
assert.equal(run('dpkg-deb',['-f',candidate,'Version']).trim(),version+'+utilibre1');
const result={date:new Date().toISOString(),suite,version:version+'+utilibre1',candidateSha256:sha(candidate),baselineSha256:sha(baseline),helper,configs,abi,maintainerScriptsUnchanged:scripts,upstreamResults,upstreamTests:'Both native simple and LDAP build check targets passed in unprivileged isolated compiler',productionChanged:false};
fs.writeFileSync(out+'/native.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({suite,configs:configs.length,binaries:abi.length,helper,productionChanged:false}));
