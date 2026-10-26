/** Offline capacity envelope for v0.2 SQLite FTS, NOT an AML Full or Cloudflare load test. */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const count=Number(process.env.CAPACITY_ROWS||1200);
if(!Number.isSafeInteger(count)||count<100||count>20000)throw Error('CAPACITY_ROWS must be 100..20000');
const schema=readFileSync(new URL('../schema.sql',import.meta.url),'utf8');
const cases={
  repetitive:i=>('assistant\nIssue R-'+(i%80)+': regression in ParserCache.loadConfig of module parser/cache.ts. Verified the patch uses timestamp-checked update, and regression tests passed. Source context and traceback.\n').repeat(8),
  diverse:i=>{let x=i>>>0;const a=[];for(let j=0;j<180;j++){x=(Math.imul(x+7919,1664525)+1013904223)>>>0;a.push('var'+x.toString(36)+'_parser'+j%11);}return 'assistant\n'+a.join(' ')+'\n';},
  code:i=>'user\nRepository src/module_'+(i%19)+'/migration_'+(i%17)+'.ts\n'+Array.from({length:26},(_,j)=>'function process'+j+'(record: Record<string, string>) { const stage'+j+' = record.cache'+i%9+'; return stage'+j+' || fallback; }').join('\n')
};
const samples=[];
for(const [kind,make] of Object.entries(cases)){
  const db=new DatabaseSync(':memory:');db.exec(schema);
  const insert=db.prepare('INSERT INTO memories(user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?)');
  let raw=0;
  for(let i=0;i<count;i++){
    const content=make(i);
    const signals=(content.match(/(?:ParserCache|module_\d+|process\d+)/g)||[]).slice(0,15).join(' ')||'none';
    raw+=Buffer.byteLength(content,'utf8');
    insert.run('user'+(i%30),'session'+i,'req'+i,0,content,signals,'2026-10-26T00:00:00Z');
  }
  const bytes=Number(db.prepare('PRAGMA page_count').get().page_count)*Number(db.prepare('PRAGMA page_size').get().page_size);
  samples.push({kind,rows:count,rawMB:+(raw/1e6).toFixed(2),sqliteMB:+(bytes/1e6).toFixed(2),expansion:+(bytes/raw).toFixed(2)});
  db.close();
}
const suiteTokens=1_800_000_000,bytesPerToken=4,chunkChars=1850;
const projectedChunks=Math.ceil(suiteTokens*bytesPerToken/chunkChars);
const projection=samples.map(v=>({kind:v.kind,projectedGB:+(suiteTokens*bytesPerToken*v.expansion/1e9).toFixed(2),overFree5GB:v.expansion*suiteTokens*bytesPerToken>5e9}));
const result={label:'OFFLINE PROJECTION ONLY; no organizer data used',assumptions:{suiteTokens,bytesPerToken,chunkChars,projectedChunks,minimumDaysAt100kRowWritesPerDay:Math.ceil(projectedChunks/100000),d1FreeDatabases:10,d1FreeMaximumEachMB:500,d1FreeTotalGB:5,d1FreeRowsWrittenPerDay:100000,d1QueriesPerWorkerRequest:50},samples,projection};
console.log(JSON.stringify(result,null,2));
if(samples.some(v=>v.expansion<1))throw Error('Invalid capacity accounting');