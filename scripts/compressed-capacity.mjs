/** Synthetic compressed BLOB + bounded sparse-FTS capacity probe, not official AML. */
import {DatabaseSync} from 'node:sqlite';
import {gzipSync} from 'node:zlib';
const COUNT=Number(process.env.CAPACITY_ROWS||1200);
const cases={
 repetitive:i=>('assistant\nIssue R-'+i%80+': regression in ParserCache.loadConfig of module parser/cache.ts. Verified the patch uses timestamp-checked update, and regression tests passed. Source context and traceback.\n').repeat(8),
 diverse:i=>{let x=i>>>0;const a=[];for(let j=0;j<180;j++){x=(Math.imul(x+7919,1664525)+1013904223)>>>0;a.push('var'+x.toString(36)+'_parser'+j%11);}return 'assistant\n'+a.join(' ')+'\n';},
 code:i=>'user\nRepository src/module_'+i%19+'/migration_'+i%17+'.ts\n'+Array.from({length:26},(_,j)=>'function process'+j+'(record: Record<string,string>) { const stage'+j+' = record.cache'+i%9+'; return stage'+j+' || fallback; }').join('\n')
};
const ddl=[
 'CREATE TABLE memories(id INTEGER PRIMARY KEY, user_id TEXT, gz BLOB, index_text TEXT,signals TEXT);',
 "CREATE VIRTUAL TABLE memory_fts USING fts5(index_text,signals,content='memories',content_rowid='id');",
 'CREATE TRIGGER memory_insert AFTER INSERT ON memories BEGIN INSERT INTO memory_fts(rowid,index_text,signals) VALUES(new.id,new.index_text,new.signals); END;'
].join('\n');
const size=db=>db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size;
const output=[];
for(const [scenario,make] of Object.entries(cases)){
 const db=new DatabaseSync(':memory:');db.exec(ddl);
 const put=db.prepare('INSERT INTO memories(user_id,gz,index_text,signals) VALUES(?,?,?,?)');let raw=0,gzip=0;
 for(let i=0;i<COUNT;i++){
  const c=make(i),t=c.toLowerCase().match(/[a-z][a-z0-9_]{2,}/g)||[];
  const idx=[...new Set(t)].slice(0,210).join(' '),gz=gzipSync(Buffer.from(c),{level:6});
  raw+=Buffer.byteLength(c);gzip+=gz.length;
  put.run('user'+i%30,gz,idx,'parser cache source');
 }
 const bytes=size(db),ratio=bytes/raw;
 output.push({scenario,records:COUNT,rawMB:+(raw/1e6).toFixed(2),gzipPayloadMB:+(gzip/1e6).toFixed(2),indexedSQLiteMB:+(bytes/1e6).toFixed(2),databaseToRawRatio:+ratio.toFixed(3),projectionGB:+(7.2*ratio).toFixed(2)});
 db.close();
}
console.log(JSON.stringify({label:'Synthetic input only, zero evidence of AML Full scalability',assumptions:{totalTokens:1800000000,bytesPerToken:4,rawPerRecord:'approximately 1.5–3.5KB; D1 row write limits still apply'},samples:output},null,2));
