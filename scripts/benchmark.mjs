// Fully synthetic, deterministic regression benchmark; not an official AML score.
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {indexSignals,searchPlans,fuseRanks} from '../src/retrieval.js';
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
const TASKS=[
 ['retryAfterMs','HTTP 429 retry delay','Parse Retry-After seconds and apply exponential backoff'],
 ['normalizeTenantId','tenant IDs whitespace','Normalize whitespace before constructing tenant cache key'],
 ['lockRefreshToken','refresh token race','Protect token refresh with a shared async mutex'],
 ['SqliteCheckpoint','WAL file growth','Checkpoint WAL once background writes are idle'],
 ['hydrateSidebar','sidebar hydration mismatch','Defer client-only storage reads until mounted'],
 ['parseYamlConfig','YAML anchors validation','Reject recursive aliases and cap expansion depth'],
 ['useSignalStore','React stale closure','Subscribe through useSyncExternalStore to avoid stale closures'],
 ['buildUserCacheKey','multi tenant cache leak','Include tenant identifier in cache namespace'],
 ['resolveSymlinkPath','archive path traversal','Resolve paths then enforce destination base containment'],
 ['commitJobBatch','double processing on worker crash','Use idempotency key and atomic transaction'],
 ['fetchS3Parts','multipart upload missing etags','Collect part ETags before CompleteMultipartUpload'],
 ['getFeedCursor','pagination skips rows','Use composite timestamp and ID cursor ordering'],
 ['checkOAuthState','OAuth redirect state mismatch','Persist signed nonce and verify redirect state'],
 ['parseWorkerEnv','missing environment secret','Validate required env keys during startup'],
 ['migrateWidgets','migration locks production database','Perform expand and contract schema phases'],
 ['processDeadLetters','queue poison message loop','Bound retry attempts and route to dead letter'],
 ['renderDataGrid','virtualized list jitter','Use stable row keys and measured item heights'],
 ['applyDiscountTax','invoice tax rounding','Compute tax on line totals with decimal arithmetic'],
 ['refreshGraphIndex','search results stale','Rebuild inverted index after commit and invalidate cache'],
 ['decodeZipEntry','ZIP decompression bomb','Limit actual streamed bytes and reject oversized entries'],
 ['renameCaseOnly','case insensitive filename rename','Use intermediate temp name before final rename'],
 ['validateWebhookSig','webhook replay attack','Validate HMAC over raw body and timestamp tolerance'],
 ['streamCsvImport','CSV multiline quoting bug','Use state machine that handles embedded quoted newlines'],
 ['computeCoverage','test coverage missing files','Include worker subprocess coverage in report'],
 ['aggregateDailyCost','daily cost timezone errors','Group by explicit UTC day boundary before billing'],
 ['handleSocketDisconnect','websocket connection leaks','Remove listeners and cancel reconnect timer'],
 ['formatJsonLines','JSONL stream broken records','Buffer partial bytes between stream chunks'],
 ['planDependencyOrder','DAG planner repeated nodes','Topological sort with visited state'],
 ['resolveApiEndpoint','API gateway double prefix','Normalize slash and strip duplicated base segments'],
 ['upgradeJsonSchema','schema migration rejects old records','Version discriminator with backward compatible decoder']
];
const WORDS='jwt session csrf nonce cookie router handler cache retry mutex queue transaction rollback index migration schema parser token workspace config socket worker manifest blob storage batch promise middleware serializer client endpoint hook callback renderer deployment query branch build'.split(' ');
let id=0;
const add=(content,user='coding')=>{
 const k=++id;
 db.prepare('INSERT INTO memories(id,user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?,?)').run(k,user,'s','r'+k,0,content,indexSignals(content),'2026-10-01T00:00:00Z');
 return k;
};
function random(n){const x=Math.sin(n*12937.8+35.2)*43758.5453;return x-Math.floor(x);}
const targets=[];
for(const [symbol,question,answer] of TASKS)targets.push({id:add('Engineering memory: '+symbol+'. Incident: '+question+'. Confirmed resolution: '+answer+'. Regression test added for '+symbol+'.'),symbol,question});
for(let i=0;i<600;i++){
 const w=Array.from({length:8},(_,j)=>WORDS[Math.floor(random(i*13+j*7+2)*WORDS.length)]).join(' ');
 add('Historical engineering activity: '+w+'. Old triage log #'+i+' noted test assertions around '+w+' but this is not the accepted fix.');
}
for(let i=0;i<100;i++)add('Other user secrets and data task '+i+': retryAfterMs normalizeTenantId lockRefreshToken.','another-user');
const querySql=(match,scope,limit)=>db.prepare('SELECT m.id,m.content,m.created_at,bm25(memory_fts,1.0,1.6) AS rank FROM memory_fts JOIN memories m ON m.id=memory_fts.rowid WHERE memory_fts MATCH ? AND m.user_id=? ORDER BY rank LIMIT ?').all(match,scope,limit);
const methods={
 singleFts:q=>{const p=searchPlans(q).find(x=>x.weight===1);return p?querySql(p.match,'coding',100):[];},
 hybridFusion:q=>fuseRanks(searchPlans(q).map(p=>({weight:p.weight,rows:querySql(p.match,'coding',220)})),100)
};
const output={description:'Synthetic distractor fixture only; not official AML evaluation',totalMemories:id};
for(const [name,fn] of Object.entries(methods)){
 const ranks=targets.map(t=>{const a=fn('In project code, how do we fix '+t.question+' in '+t.symbol+'?');const r=a.findIndex(x=>+x.id===t.id);return r<0?999:r+1;});
 output[name]={cases:ranks.length,top1:ranks.filter(r=>r===1).length,top5:ranks.filter(r=>r<=5).length,top10:ranks.filter(r=>r<=10).length};
}
console.log(JSON.stringify(output,null,2));