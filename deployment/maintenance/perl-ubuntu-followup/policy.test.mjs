import test from 'node:test';import assert from 'node:assert/strict';
import {simulationGate,unrelatedPackages,packages,version} from './policy.mjs';
const ok='4 upgraded, 0 newly installed, 0 to remove\n'+packages.map(p=>'Inst '+p+' [5.38.2-3.2ubuntu0.2] ('+version+' Ubuntu [amd64])').join('\n');
test('exact four native packages only',()=>{simulationGate(ok);for(const bad of [ok+'\nInst libc6 (99 unstable)',ok.replace('Inst perl [','Remv perl ['),ok.replace(version,'5.40.0'),ok.replace('perl-base','perl-doc')])assert.throws(()=>simulationGate(bad));});
test('full installed-package preservation rejects drift',()=>{const b=packages.map(p=>p+'=5.38.2-3.2ubuntu0.2').join('\n')+'\nlibc6=2.39';const a=packages.map(p=>p+'='+version).join('\n')+'\nlibc6=2.39';unrelatedPackages(b,a);assert.throws(()=>unrelatedPackages(b,a.replace('2.39','2.40')));assert.throws(()=>unrelatedPackages(b,a+'\nnew=1'));});
