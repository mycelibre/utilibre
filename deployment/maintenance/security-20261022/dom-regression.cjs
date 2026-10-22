// Synthetic upstream-advisory regressions. No external resources or eval.
const assert=require('node:assert/strict');
const {JSDOM}=require('/srv/gathio/node_modules/jsdom');
const create=require('/srv/gathio/node_modules/dompurify');
const win=new JSDOM('<!doctype html><body></body>').window,doc=win.document;
const D=create(win),host=doc.createElement('div'),root=host.attachShadow({mode:'open'});
root.append(doc.createTextNode('$'),doc.createElement('object'),doc.createTextNode('{fictionalValue}'));
D.sanitize(host,{IN_PLACE:true,SAFE_FOR_TEMPLATES:true});root.normalize();
const results={version:D.version,shadowExpressionRemoved:!root.textContent.includes('${fictionalValue}'),hooks:{}};
for(const mode of ['self','parent','nextSibling']){
 const purify=create(win);
 doc.body.innerHTML='<div id="root"><figure><img class="bad"><img id="evil" onerror="fictionalHandler()"></figure><p>ok</p></div>';
 const subtree=doc.getElementById('root'),evil=doc.getElementById('evil');
 purify.addHook('afterSanitizeAttributes',n=>{if(n.getAttribute?.('class')==='bad'){
  if(mode==='self')n.remove();if(mode==='parent')n.parentNode.remove();if(mode==='nextSibling')n.nextElementSibling.remove();
 }});
 purify.sanitize(subtree,{IN_PLACE:true});results.hooks[mode]=evil.getAttribute('onerror')===null;
}
assert.equal(D.sanitize('<b>Café</b><script>fictional()</script>'),'<b>Café</b>');
const toml=require('/srv/gathio/node_modules/toml');
const parsed=toml.parse('[general]\nsite_name="Fictional café"\nport="3000"\nis_federated=false\n');
assert.equal(parsed.general.site_name,'Fictional café');assert.equal(parsed.general.port,'3000');assert.equal(parsed.general.is_federated,false);
assert.throws(()=>toml.parse('[unclosed'));
results.normalMarkupAndToml=true;
if(D.version==='3.4.16'){assert.equal(results.shadowExpressionRemoved,false);assert.equal(results.hooks.parent,false);assert.equal(results.hooks.nextSibling,false);}
else {assert.equal(D.version,'3.4.17');assert(results.shadowExpressionRemoved);assert(Object.values(results.hooks).every(Boolean));}
win.close();console.log(JSON.stringify(results));
