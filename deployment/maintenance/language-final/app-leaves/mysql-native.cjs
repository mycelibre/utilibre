const assert=require('node:assert/strict'),fs=require('node:fs');
const path=process.argv[2];assert(path&&path.endsWith('/mysql2'));
assert.equal(JSON.parse(fs.readFileSync(path+'/package.json')).version,'3.23.1');
const mysql=require(path+'/promise.js');
(async()=>{
 const db=await mysql.createConnection({host:'127.0.0.1',user:'fixture',password:'fictional-local-only',database:'fixture',charset:'utf8mb4',namedPlaceholders:true});
 await db.query('CREATE TEMPORARY TABLE fictional (id INT PRIMARY KEY, label VARCHAR(100), amount DECIMAL(9,2)) CHARACTER SET utf8mb4');
 await db.execute('INSERT INTO fictional VALUES (?, ?, ?)',[1,'piñata 🙂',12.50]);
 const [rows]=await db.execute('SELECT * FROM fictional WHERE id=:id',{id:1});
 assert.equal(rows[0].label,'piñata 🙂');assert.equal(rows[0].amount,'12.50');
 await db.beginTransaction();await db.execute('INSERT INTO fictional VALUES (?, ?, ?)',[2,'fictional rollback',7]);await db.rollback();
 const [count]=await db.query('SELECT COUNT(*) AS n FROM fictional');assert.equal(count[0].n,1);
 const roundtrip=JSON.parse(JSON.stringify(rows));assert.deepEqual(roundtrip,[{id:1,label:'piñata 🙂',amount:'12.50'}]);
 await db.end();console.log(JSON.stringify({status:'passed',version:'3.23.1',preparedQuery:true,namedPlaceholders:true,utf8mb4:true,transactionRollback:true,jsonExportRoundtrip:true}));
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
