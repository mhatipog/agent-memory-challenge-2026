/** Compressed-evidence / sparse-index ablation on pinned Apache-2.0 corpus, NOT official AML. */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {indexSignals,searchPlans,fuseRanks,rerankEvidence,terms,codeTokens} from '../src/retrieval.js';
const REV='cdc6032bf6575bd17812fd1e06ec211355d2200b';
const BASE='https://raw.githubusercontent.com/pa4uslf/agentmemory-for-codex/'+REV+'/eval/data/coding-agent-life-v1/';
async function load(name){const r=await fetch(BASE+name,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(name+': '+r.status);return r.json();}
const [sessions,queries]=await Promise.all([load('sessions.json'),load('queries.json')]);
if(sessions.length!==15||queries.length!==15)throw Error('Unexpected pinned fixture shape');
const original=new DatabaseSync(':memory:');
original.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
const compact=new DatabaseSync(':memory:');
compact.exec([
 'CREATE TABLE memories(id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, request_id TEXT, gz BLOB NOT NULL, index_text TEXT NOT NULL, signals TEXT NOT NULL, created_at TEXT);',
 "CREATE VIRTUAL TABLE memory_fts USING fts5(index_text,signals,content='memories',content_rowid='id');",
 'CREATE TRIGGER memory_insert AFTER INSERT ON memories BEGIN INSERT INTO memory_fts(rowid,index_text,signals) VALUES(new.id,new.index_text,new.signals); END;',
 'CREATE INDEX scoped_memories ON memories(user_id,id);'
].join('\n'));
const insert=original.prepare('INSERT INTO memories(user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?)');
const insertSmall=compact.prepare('INSERT INTO memories(user_id,request_id,gz,index_text,signals,created_at) VALUES(?,?,?,?,?,?)');
for(const s of sessions){
 const c=String(s.content),signals=indexSignals(c);
 const lexical=[...new Set([...codeTokens(c).slice(0,90),...terms(c).slice(0,210)])].join(' ');
 insert.run('public','s',s.id,0,c,signals,s.timestamp);
 insertSmall.run('public',s.id,gzipSync(Buffer.from(c),{level:6}),lexical,signals,s.timestamp);
}
const map=new Map(sessions.map((s,i)=>[s.id,i+1]));
const query='SELECT m.*, bm25(memory_fts,1,1.6) AS rank FROM memory_fts JOIN memories m ON m.id=memory_fts.rowid WHERE memory_fts MATCH ? AND m.user_id=? ORDER BY rank LIMIT 100';
const mainQuery=original.prepare(query),otherQuery=compact.prepare(query);
function retrieval(mode,user,q){
 const groups=searchPlans(q).map(p=>{
  const rows=(mode==='normal'?mainQuery:otherQuery).all(p.match,user);
  return {weight:p.weight,rows:rows.map(row=>mode==='compressed'?{...row,content:gunzipSync(row.gz).toString('utf8')}:row)};
 });
 return rerankEvidence(fuseRanks(groups,100),q,{limit:100});
}
function evaluate(mode){
 const cases=queries.map(q=>{
  const ranks=retrieval(mode,'public',q.question).map(r=>Number(r.id));
  const wanted=q.goldSessionIds.map(x=>map.get(x));
  if(wanted.some(x=>!x))throw Error('Gold mapping invalid');
  const places=wanted.map(x=>{const n=ranks.indexOf(x);return n<0?999:n+1;});
  return {id:q.id,rank:Math.min(...places),recall5:places.filter(x=>x<=5).length/places.length};
 });
 return {top1:cases.filter(x=>x.rank===1).length,recall5:+(cases.reduce((s,x)=>s+x.recall5,0)/cases.length).toFixed(4),mrr10:+(cases.reduce((s,x)=>s+(x.rank<=10?1/x.rank:0),0)/cases.length).toFixed(4),cases};
}
const normal=evaluate('normal'),compressed=evaluate('compressed');
if(retrieval('compressed','other-user','bug').length)throw Error('Cross-user leakage');
const footprint=db=>db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size;
const a=footprint(original),b=footprint(compact);
console.log(JSON.stringify({label:'Public pinned Apache-2.0 fixture. NOT official AML / NOT unseen final holdout',cases:queries.length,normal:{top1:normal.top1,recall5:normal.recall5,mrr10:normal.mrr10},compressed:{top1:compressed.top1,recall5:compressed.recall5,mrr10:compressed.mrr10},sqliteBytes:{normal:a,compressed:b},storageReductionPercent:+(100*(a-b)/a).toFixed(1),pairs:normal.cases.map((x,i)=>({id:x.id,normalRank:x.rank,compressedRank:compressed.cases[i].rank})),caveat:'15 sessions: insufficient for full-scale or confidence-interval inference'},null,2));
