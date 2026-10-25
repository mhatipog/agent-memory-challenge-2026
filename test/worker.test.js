import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
class FakeD1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));}
 prepare(sql){const st=this.db.prepare(sql);return {bind:(...args)=>({all:async()=>({results:st.all(...args)}),run:async()=>({success:true,result:st.run(...args)})})};}
 async batch(stmts){return await Promise.all(stmts.map(s=>s.run()));}
 rows(){return this.db.prepare('select count(*) as c from memories').get().c;}
}
async function send(db,path,data,key='testkey'){
 const req=new Request('https://local.example'+path,{method:'POST',headers:{'content-type':'application/json','x-api-key':key},body:JSON.stringify(data)});
 const res=await worker.fetch(req,{DB:db,MEMORY_API_KEY:'testkey'});
 return {status:res.status,json:await res.json()};
}
test('health, auth and validation',async()=>{
 const db=new FakeD1();
 const res=await worker.fetch(new Request('https://local.example/health'),{DB:db,MEMORY_API_KEY:'testkey'});
 assert.equal(res.status,200);assert.equal((await res.json()).status,'ok');
 assert.equal((await send(db,'/add',{},'wrong')).status,401);
 assert.equal((await send(db,'/add',{})).status,422);
});
test('Add is immediately searchable and idempotent on retries',async()=>{
 const db=new FakeD1(),b={request_id:'r-1',user_id:'u-1',session_id:'s-1',messages:[{role:'user',content:'Fix serializeUserProfile in src/store.js by changing retry logic.'}]};
 assert.equal((await send(db,'/add',b)).status,200);
 const count=db.rows();assert.ok(count>0);
 assert.equal((await send(db,'/add',b)).status,200);assert.equal(db.rows(),count);
 const r=await send(db,'/search',{user_id:'u-1',query:'serializeUserProfile retry bug',top_k:100});
 assert.ok(r.json.data.length>0);
});
test('user isolation, raw evidence, no fabricated answers',async()=>{
 const db=new FakeD1();
 for(const [u,txt] of [['u1','The widgetFactory race was fixed by atomically swapping a cache.'],['u2','The widgetFactory race was fixed by saving secret token SECRET_LEAK_ABC.']]){
  const b={request_id:u,user_id:u,session_id:u,messages:[{role:'assistant',content:txt}]};
  assert.equal((await send(db,'/add',b)).status,200);
 }
 const x=await send(db,'/search',{user_id:'u1',query:'How was widgetFactory race fixed?',top_k:100});
 assert.equal(x.status,200);assert.ok(x.json.data[0].content.includes('cache'));
 assert.ok(!JSON.stringify(x.json).includes('SECRET_LEAK_ABC'));
 const y=await send(db,'/search',{user_id:'no-such',query:'widgetFactory',top_k:100});
 assert.deepEqual(y.json.data,[]);
});
test('malicious lexical query cannot bypass scope',async()=>{
 const db=new FakeD1();
 await send(db,'/add',{request_id:'a',user_id:'legit',session_id:'s',messages:[{role:'user',content:'database password is NOT_A_TEST_SECRET'}]});
 const r=await send(db,'/search',{user_id:'outsider',query:'" OR " password: *',top_k:100});
 assert.equal(r.status,200);assert.deepEqual(r.json.data,[]);
});
test('historical timestamps and long evidence preserved',async()=>{
 const db=new FakeD1();
 const txt='Long traceback with unique function serializeManyUsers\n'.repeat(200);
 const a=await send(db,'/add',{request_id:'long',user_id:'u',session_id:'s',messages:[{role:'user',content:txt,timestamp:1704067200000}]});
 assert.equal(a.status,200);assert.ok(db.rows()>4);
 const x=await send(db,'/search',{user_id:'u',query:'serializeManyUsers function traceback',top_k:8});
 assert.equal(x.status,200);assert.ok(x.json.data.length>=4);
 assert.equal(x.json.data[0].created_at,'2024-01-01T00:00:00.000Z');
});