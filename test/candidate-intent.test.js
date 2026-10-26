import test from 'node:test';
import assert from 'node:assert/strict';
import {codingMemoryIntent,rerankByHistoryIntent} from '../src/candidate-intent.js';
import {rerankEvidence} from '../src/retrieval.js';

const base=[
 {id:'11',content:'searchConfig FAILED ATTEMPT: moving cache to a module static did not work; still broken in live reload.',score:.062},
 {id:'12',content:'searchConfig final fix verified: tenant-scoped dependency invalidation, regression tests passed.',score:.057},
 {id:'13',content:'Unrelated changelog: cache time',score:.02}
];
test('explicit negative-history question retrieves failed attempt rather than verified fix',()=>{
 const q='Which earlier searchConfig cache patch failed and did not work?';
 assert.equal(codingMemoryIntent(q),'failure');
 const a=rerankEvidence(base,q,{limit:3});
 const b=rerankByHistoryIntent(base,q,{limit:3});
 assert.equal(a[0].id,'12','v0.2 produces the failure-mode control');
 assert.equal(b[0].id,'11');
});
test('successful-resolution question retains the current source-ranked behavior',()=>{
 const q='How was searchConfig finally fixed?';
 assert.equal(codingMemoryIntent(q),'current');
 assert.deepEqual(rerankByHistoryIntent(base,q,{limit:3}),rerankEvidence(base,q,{limit:3}));
});
test('neutral query does not change evidence ranking',()=>{
 const q='What changed in searchConfig cache?';
 assert.equal(codingMemoryIntent(q),'neutral');
 assert.deepEqual(rerankByHistoryIntent(base,q,{limit:2}),rerankEvidence(base,q,{limit:2}));
});
test('candidate never synthesizes or expands raw memory evidence',()=>{
 const q='Why did the earlier searchConfig cache patch fail?';
 const a=rerankByHistoryIntent(base,q,{limit:3});
 assert.deepEqual(new Set(a.map(r=>r.id)),new Set(base.map(r=>r.id)));
 for(const r of a)assert.equal(r.content,base.find(x=>x.id===r.id).content);
});
