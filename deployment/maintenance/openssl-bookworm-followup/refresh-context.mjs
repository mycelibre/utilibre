// OpenSSL 3.0.22 reformatted argument indentation since Ubuntu's 3.0.13 base.
// Refresh two context-only lines; the maintained fix/test +/- bytes must match.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const file=process.argv[2];assert.equal(process.argv.length,3);
const before=fs.readFileSync(file,'utf8');
assert.equal(createHash('sha256').update(before).digest('hex'),'50ad8c00cc9fa93b79704a116df6486461c3192d3412a77749bb4c4cd4692589');
let after=before;
for(const text of ['frag->msg_header.msg_len + header_length);','frag->msg_header.msg_len,']){
 const lines=after.split('\n').filter(l=>l.startsWith(' ')&&l.trim()===text);
 assert.equal(lines.length,1);after=after.replace(lines[0],'         '+text);
}
const changes=text=>text.split('\n').filter(l=>/^[+-]/.test(l)).join('\n');
assert.equal(changes(after),changes(before));assert.notEqual(after,before);
fs.writeFileSync(file,after);
console.log('Only two pre-existing argument-indentation context lines refreshed; fix and test additions/deletions unchanged.');
