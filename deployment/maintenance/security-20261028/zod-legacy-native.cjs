// Zod 4.1.11 has no map bounds API: test its actual four container bounds.
// Keep the original six-case fixture unchanged for current 4.x versions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const root = process.argv[2];
const z = require(root);
async function main() {
  let normalChecks = 0;
  const ok = fn => { fn(); normalChecks++; };
  ok(() => assert.equal(z.string().trim().parse(' Árbol '), 'Árbol'));
  ok(() => assert.equal(z.number().int().parse(12), 12));
  ok(() => assert(!z.number().int().safeParse(1.5).success));
  ok(() => assert.deepEqual(z.object({name:z.string(),n:z.coerce.number()}).parse({name:'Fictional',n:'3'}), {name:'Fictional',n:3}));
  ok(() => assert.equal(z.string().default('example').parse(undefined),'example'));
  ok(() => assert.equal(z.string().optional().parse(undefined),undefined));
  ok(() => assert(z.enum(['es','en']).safeParse('es').success));
  ok(() => assert(!z.enum(['es','en']).safeParse('other').success));
  ok(() => assert.deepEqual(z.array(z.string()).max(3).parse(['a','b']),['a','b']));
  ok(() => assert.equal(z.set(z.string()).max(3).parse(new Set(['a'])).size,1));
  ok(() => assert.equal(z.map(z.string(),z.number()).parse(new Map([['a',2]])).get('a'),2));
  ok(() => assert.deepEqual(z.array(z.number()).parse([1,2,3,4]),[1,2,3,4]));
  ok(() => assert.deepEqual(z.array(z.number()).overwrite(a=>a.slice(0,1)).max(1).parse([1,2]),[1]));
  assert.equal(await z.string().transform(async s=>s.toUpperCase()).parseAsync('es'),'ES'); normalChecks++;
  const esm=await import(pathToFileURL(root+'/index.js').href);
  ok(() => assert.deepEqual(esm.z.object({n:esm.z.number()}).parse({n:3}),{n:3}));
  const results=[];
  for (const kind of ['array-max','array-length','set-max','set-size']) {
    let calls=0;
    const element=z.string().transform(s=>{calls++; return s;});
    const entries=Array.from({length:20},(_,i)=>'item'+i);
    let schema,input;
    if(kind.startsWith('array')){schema=z.array(element);schema=kind.endsWith('length')?schema.length(2):schema.max(2);input=entries;}
    else if(kind.startsWith('set')){schema=z.set(element);schema=kind.endsWith('size')?schema.size(2):schema.max(2);input=new Set(entries);}
    else{schema=z.map(element,z.number());schema=kind.endsWith('size')?schema.size(2):schema.max(2);input=new Map(entries.map((x,i)=>[x,i]));}
    const result=schema.safeParse(input);assert(!result.success);assert(result.error.issues.some(i=>i.code==='too_big'));
    results.push({kind,calls,issues:result.error.issues.length});
  }
  console.log(JSON.stringify({passed:true,version:JSON.parse(fs.readFileSync(root+'/package.json')).version,normalChecks,results,earlyBounds:results.every(r=>r.calls===0&&r.issues===1)}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
