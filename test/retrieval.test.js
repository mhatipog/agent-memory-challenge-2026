import test from 'node:test';
import assert from 'node:assert/strict';
import {terms,codeTokens,indexSignals,chunkMessage,searchPlans,fuseRanks} from '../src/retrieval.js';
test('preserves raw evidence across chunk boundaries',()=>{
 const t=('error tracing '+('x'.repeat(150))+'\n').repeat(30);
 const c=chunkMessage({role:'user',content:t},500);
 assert.ok(c.length>5);assert.ok(c.every(x=>x.startsWith('user\n')));assert.ok(c.every(x=>x.length<=510));
});
test('code paths and symbols derive indexed aliases',()=>{
 const s=indexSignals('fix serializeUserProfile in src/database/user_store.py, PostgreSQL JSONB');
 for(const x of ['serializeuserprofile','user','store','postgresql','jsonb'])assert.ok(s.includes(x),x);
});
test('handles camelCase and stopwords',()=>{
 const s=terms('How to fix failed parseDataFile in XMLLoader?');
 assert.ok(s.includes('parsedatafile'));assert.ok(s.includes('parse'));assert.ok(!s.includes('how'));
});
test('FTS expression injection cannot introduce search operators',()=>{
 const p=searchPlans('" OR secret:*');const x=p[0]?.match||'';
 assert.ok(!x.includes(':*'));
});
test('fusion boosts multi-strategy matching',()=>{
 const mk=id=>({id,content:'evidence '+id,created_at:'2026-01-01T00:00:00Z'});
 const r=fuseRanks([{weight:1,rows:[mk(1),mk(2)]},{weight:1.6,rows:[mk(2),mk(3)]}],3);
 assert.equal(r[0].id,'2');
});