import fs from 'node:fs';
// Fail closed on an occupied/stale lock. An operator must verify that its
// process has stopped before removing a stale file; never guess from its age.
export function acquireReleaseLock(file){
 const fd=fs.openSync(file,'wx',0o600),identity=fs.fstatSync(fd);
 fs.writeFileSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})+'\n');
 fs.closeSync(fd);let held=true;
 return ()=>{if(!held)return;const current=fs.statSync(file);if(current.ino!==identity.ino||current.dev!==identity.dev)throw Error('Release lock identity changed');fs.unlinkSync(file);held=false;};
}
