import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCodingEvidence} from '../src/formation.js';
test('short engineering histories remain lossless',()=>{
 const t='A prior decision: return original evidence and pass regression tests.';
 const r=selectCodingEvidence(t);
 assert.equal(r.text,t);assert.equal(r.compressed,false);
});
test('preserves verifiable fix near the middle of long noisy trace',()=>{
 const noise=Array.from({length:350},(_,i)=>'INFO worker started heartbeat '+i+' '.repeat(8)).join('\n');
 const key='Verified root cause: src/refresher.py TimeoutError resolved by an atomic compare-and-swap. Regression tests passed.';
 const raw=noise.slice(0,Math.floor(noise.length/2))+'\n'+key+'\n'+noise.slice(Math.floor(noise.length/2));
 const x=selectCodingEvidence(raw,{maxChars:8000,passthroughChars:4000});
 assert.ok(x.compressed);assert.ok(x.text.includes(key));
 assert.ok(x.selected < raw.length);assert.ok(x.text.length <= 8500);
});
test('does not invent code or solutions during formation',()=>{
 const source='Historical evidence\n'+('random unrelated output line\n').repeat(1000);
 const x=selectCodingEvidence(source,{maxChars:3000,passthroughChars:2000});
 for(const p of x.text.split('\n[Original trajectory evidence omitted to fit memory budget]\n'))assert.ok(source.includes(p));
});
test('separates loss and retention stats',()=>{
 const source='root cause: file.py solved by changing error handler\n'.repeat(2000);
 const x=selectCodingEvidence(source,{maxChars:4000,passthroughChars:3000});
 assert.ok(x.selected<=source.length);
 assert.ok(x.original===source.length);
 assert.ok(x.text.length <= 5500);
});