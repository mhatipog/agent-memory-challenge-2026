// External 15-session coding-memory dataset from agentmemory-for-codex (Apache-2.0).
// Pinned source; no private AML samples or answers ingested into retrieval.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {indexSignals,searchPlans,fuseRanks,rerankEvidence,terms} from '../src/retrieval.js';
const REV='cdc6032bf6575bd17812fd1e06ec211355d2200b';
const base='https://raw.githubusercontent.com/pa4uslf/agentmemory-for-codex/'+REV+'/eval/data/coding-agent-life-v1/';
async function json(name){
 const r=await fetch(base+name,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Cannot load pinned Apache-2.0 fixture: '+name+' '+r.status);
 return r.json();
}
const [sessions,queries]=await Promise.all([json('sessions.json'),json('queries.json')]);
if(!Array.isArray(sessions)||sessions.length!==15||!Array.isArray(queries)||queries.length!==15)throw Error('Pinned benchmark unexpectedly changed');
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
const ins=db.prepare('INSERT INTO memories(user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?)');
const gold=new Map();
for(let i=0;i<sessions.length;i++){
 const s=sessions[i];const id=i+1;
 const content=s.content;
 ins.run('external-bench','s',s.id,0,content,indexSignals(content),s.timestamp);
 gold.set(s.id,id);
}
const querySql=db.prepare("SELECT m.id,m.content,m.created_at,m.request_id,m.part,bm25(memory_fts,1,1.6) AS rank FROM memory_fts JOIN memories m ON m.id=memory_fts.rowid WHERE memory_fts MATCH ? AND m.user_id='external-bench' ORDER BY rank LIMIT 100");
const simple=q=>{
 const toks=terms(q).filter(x=>!x.includes('/')).slice(0,20).flatMap(x=>x.replace(/[^a-z0-9_]/g,' ').split(/\s+/)).filter(x=>x.length>2);
 const match=[...new Set(toks)].map(x=>'"'+x+'"').join(' OR ');
 return match?querySql.all(match):[];
};
const hybrid=q=>{
 const plans=searchPlans(q);
 const groups=plans.filter(p=>p.match).map(p=>({weight:p.weight,rows:querySql.all(p.match)}));
 return rerankEvidence(fuseRanks(groups,100),q,{limit:100});
};
function score(fn){
 const rows=queries.map(q=>{
  const rank=fn(q.question).map(x=>Number(x.id));
  const wanted=q.goldSessionIds.map(x=>gold.get(x));
  const retrieved=wanted.filter(x=>rank.slice(0,5).includes(x)).length;
  return {id:q.id,type:q.type,rank:Math.min(...wanted.map(x=>{const i=rank.indexOf(x);return i<0?999:i+1;})),gold:wanted.length,retrieved};
 });
 return {top1:rows.filter(x=>x.rank===1).length,hit5:rows.filter(x=>x.retrieved>0).length,recall5:+(rows.reduce((s,x)=>s+x.retrieved/x.gold,0)/rows.length).toFixed(4),mrr10:+(rows.reduce((s,x)=>s+(x.rank<=10?1/x.rank:0),0)/rows.length).toFixed(4),perCase:rows};
}
const result={fixture:'coding-agent-life-v1 (15 cases), third-party Apache-2.0',source:'https://github.com/pa4uslf/agentmemory-for-codex',revision:REV,corpus:sessions.length,queries:queries.length,simpleFTS:score(simple),hybrid:score(hybrid)};
console.log(JSON.stringify(result,null,2));
if(result.hybrid.recall5 < result.simpleFTS.recall5)process.exitCode=1;
