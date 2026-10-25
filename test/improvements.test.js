import test from 'node:test';
import assert from 'node:assert/strict';
import {indexSignals,searchPlans,rerankEvidence} from '../src/retrieval.js';
import worker from '../src/worker.js';
test('camelCase symbol aliases include segments',()=>{const x=indexSignals('loadCustomerInvoiceState in src/userStore.ts');for(const t of ['load','customer','invoice','state'])assert.ok(x.includes(t));});
test('fixed engineering resolution defeats older failed attempt',()=>{const r=rerankEvidence([{id:'1',content:'parseConfig YAML failed attempt did not work still broken',score:.05},{id:'2',content:'parseConfig confirmed root cause fixed by rejecting YAML cyclic aliases; regression tests passed',score:.047}],'parseConfig YAML cyclic alias',{limit:2});assert.equal(r[0].id,'2');});
test('strict and expanded query plans',()=>{const p=searchPlans('stale jwt retry on loadCustomerInvoiceState');assert.ok(p.some(x=>x.match.includes(' AND ')));assert.ok(p.some(x=>x.match.includes('invalidate')));});
test('large Add uses fewer than 50 database calls',async()=>{let calls=0;const DB={prepare(sql){return {bind(){return {run:async()=>{calls++;return{success:true};}}}}}};const b={request_id:'r',user_id:'u',session_id:'s',messages:[{role:'user',content:'X'.repeat(100000)}]};const res=await worker.fetch(new Request('https://test/add',{method:'POST',headers:{'x-api-key':'k'},body:JSON.stringify(b)}),{DB,MEMORY_API_KEY:'k'});assert.equal(res.status,200);assert.ok(calls<50);});
test('no unauthenticated Add/Search in production',async()=>{const res=await worker.fetch(new Request('https://test/search',{method:'POST',body:'{}'}),{DB:{}});assert.equal(res.status,503);});
