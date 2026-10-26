/** Intent ablation: pinned public 15-session corpus + deterministic negative-history tests.
 * Includes predeclared checks to prevent claiming gains solely from synthetic tests.
 */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {indexSignals,searchPlans,fuseRanks,rerankEvidence} from '../src/retrieval.js';
import {rerankByHistoryIntent} from '../src/candidate-intent.js';
const REV='cdc6032bf6575bd17812fd1e06ec211355d2200b';
const root='https://raw.githubusercontent.com/pa4uslf/agentmemory-for-codex/'+REV+'/eval/data/coding-agent-life-v1/';
async function get(name){const r=await fetch(root+name,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('fixture unavailable '+name);return r.json();}
const [sessions,queries]=await Promise.all([get('sessions.json'),get('queries.json')]);
if(sessions.length!==15||queries.length!==15)throw Error('Fixture size changed');
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
const write=db.prepare('INSERT INTO memories(user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?)');
const gold=new Map();
for(const s of sessions){const id=Number(write.run('public','session',s.id,0,s.content,indexSignals(s.content),s.timestamp).lastInsertRowid);gold.set(s.id,id);}
const sql=db.prepare("SELECT m.id,m.content,m.created_at,m.request_id,m.part,bm25(memory_fts,1,1.6) AS rank FROM memory_fts JOIN memories m ON m.id=memory_fts.rowid WHERE memory_fts MATCH ? AND m.user_id=? ORDER BY rank LIMIT 220");
function results(question,user,mode){
 const groups=searchPlans(question).map(p=>({weight:p.weight,rows:sql.all(p.match,user)}));
 const fused=fuseRanks(groups,100);
 return mode==='candidate'?rerankByHistoryIntent(fused,question,{limit:100}):rerankEvidence(fused,question,{limit:100});
}
function report(items,user){
 return Object.fromEntries(['baseline','candidate'].map(mode=>{
  const ranks=items.map(x=>{const found=results(x.query,user,mode).map(r=>Number(r.id));const positions=x.gold.map(id=>{const i=found.indexOf(id);return i<0?999:i+1;});return {rank:Math.min(...positions),recall5:positions.filter(x=>x<=5).length/positions.length};});
  return [mode,{top1:ranks.filter(x=>x.rank===1).length,recall5:+(ranks.reduce((a,x)=>a+x.recall5,0)/items.length).toFixed(4),mrr10:+(ranks.reduce((a,x)=>a+(x.rank<=10?1/x.rank:0),0)/items.length).toFixed(4)}];
 }));
}
const publicItems=queries.map(q=>({query:q.question,gold:q.goldSessionIds.map(id=>gold.get(id))}));
const publicResult=report(publicItems,'public');
const targets=['parseWorktree','syncDraftCache','openEventStream','loadTenantPolicy','reconcileBatches','parseInvoiceCsv','buildDeltaIndex','processAgentTrace','routeApiRequest','mergeRepoMetadata'];
const cases=[];
for(let i=0;i<30;i++){
 const target=targets[i%targets.length]+'_'+i;
 // Each incident has a failed and successful resolution with overlapping lexical terms.
 const prior='assistant '+target+' async retry cache broken: failed attempt did not work; still broken after attempted cache TTL change; original regressions persisted.';
 const fixed='assistant '+target+' async retry cache verified final fix: use namespace-scoped state and atomic invalidation, regression tests passed.';
 const priorId=Number(write.run('synthetic','s','bad-'+i,0,prior,indexSignals(prior),'2026-10-01T00:00:00Z').lastInsertRowid);
 write.run('synthetic','s','fixed-'+i,0,fixed,indexSignals(fixed),'2026-10-02T00:00:00Z');
 cases.push({query:'Which '+target+' async retry cache attempt failed and did not work?',gold:[priorId]});
}
const negativeResult=report(cases,'synthetic');
console.log(JSON.stringify({label:'Development-only ablation; no official AML scores',publicFixture:{size:publicItems.length,source:'Apache-2.0 coding-agent-life-v1',...publicResult},negativeHistorySynthetic:{size:cases.length,...negativeResult},note:'Synthetic status questions reflect an explicitly chosen failure mode and are NOT a blind holdout. Public corpus has 15 clean cases and insufficient power.'},null,2));
if(publicResult.candidate.recall5<publicResult.baseline.recall5)process.exitCode=1;
