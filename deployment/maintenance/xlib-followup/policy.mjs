import assert from 'node:assert/strict';
export function packageGate(suite,rows,names){
 const native={trixie:{libx11:'2:1.8.12-1+utilibre1',libxrender:'1:0.9.12-1+utilibre1'},bookworm:{libx11:'2:1.8.4-2+deb12u2+utilibre1'},dhi:{libx11:'2:1.8.12-1+dhi0+utilibre1',libxrender:'1:0.9.12-1+dhi0+utilibre1',libxtst:'2:1.2.5-1+dhi0+utilibre1'}};
 assert(native[suite]);assert.equal(new Set(names).size,names.length);assert.deepEqual(rows.map(p=>p.name),names);
 for(const p of rows){assert(['libx11-6','libx11-data','libx11-xcb1','libxrender1','libxtst6'].includes(p.name));const source=p.name.startsWith('libx11')?'libx11':p.name==='libxrender1'?'libxrender':'libxtst';assert(native[suite][source]);assert.equal(p.version,native[suite][source]);assert.match(p.sha256,/^[a-f0-9]{64}$/);}
}
export function simulationGate(text){
 const wanted=['libx11-6','libx11-data','libx11-xcb1','libxrender1'];const changes=text.split('\n').filter(l=>/^(Inst|Remv) /.test(l));assert.equal(changes.length,4);
 const found=[];for(const line of changes){assert(line.startsWith('Inst '));const name=line.split(' ')[1].replace(/:amd64$/,'');assert(wanted.includes(name));assert(line.includes('+utilibre1'));found.push(name);}
 assert.deepEqual(found.sort(),wanted.sort());assert.match(text,/4 upgraded, 0 newly installed, 0 to remove/);
}
export function refreshStaticUpstreams(key,docker){
 assert(['forms','expanded','gathio'].includes(key));
 if(key!=='expanded')return;
 // Native nginx resolves backend names at config load. Recreating the backend
 // can change its address without recreating the unchanged frontend container.
 docker('exec','utilibre-expanded-penpot-frontend-1','nginx','-t');
 docker('exec','utilibre-expanded-penpot-frontend-1','nginx','-s','reload');
}
