// Adversarial synthetic ranking regression, not CAMBench or official AML.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {indexSignals,terms,codeTokens,searchPlans,fuseRanks,rerankEvidence} from '../src/retrieval.js';
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
const put=db.prepare("INSERT INTO memories(user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?)");
let n=0;
function add(content,user='dev'){const id=++n;put.run(user,'s','r'+id,0,content,indexSignals(content),'2026-10-01T00:00:00Z');return id;}
const topics=['reactCache','parseFilterConfig','streamZipEntries','refreshAuthSession','setInvoiceTotals','mergePartitions','fetchNextPage','renderLongList','verifyWebhook','synchronizeOffline','validatePath','closeSocket','resolveTenantKey','computeDailyBill','deduceBuildOrder','commitTransaction','readCsvRecords','compileStyles','joinEventLogs','scheduleWorker','lockSharedFile','persistDraft','loadSettings','dispatchEvent','serializePayload','readLargeFile','dedupeJobQueue','renderTimeLabels','resolveImageUrl','parseJsonRecords'];
const subjects=['stale cache','invalid YAML','decompression bomb','token refresh race','decimal rounding','slow merge','pagination duplicates','scroll jumps','webhook replay','offline duplicates','symlink escape','socket leak','tenant cache isolation','timezone billing','dependency cycle','crash rollback','CSV quote handling','style cache','slow SQL join','queue starvation','file race','draft overwrite','settings lost','events delivered twice','null coercion','stream memory spike','job duplication','DST labels','URL encoding','NDJSON truncation'];
const solutions=['invalidate cache on dependency change','reject cyclic aliases','limit streamed decompressed bytes','share one inflight refresh promise','use integer minor units','prune untouched partitions','composite stable cursor','stabilize measured row heights','timestamp bound HMAC','transactional idempotency','canonicalize destination within root','remove listeners before reconnect','tenant-qualified keys','UTC billing window','SCC cycle detection','atomic transaction','carry quote state','hash style dependencies','pre-filter join keys','fair scheduling','per-resource advisory lock','monotonic revision check','await storage commit','record consumed ids','explicit tagged null','bounded chunk stream','idempotency receipt','format in event timezone','encode path segments once','buffer incomplete records'];
const test=[];
for(let i=0;i<topics.length;i++){
 const t=topics[i],s=subjects[i];
 add('Incident '+s+' in '+t+'. Failed attempt did not work: '+s+' debug patch. Still broken: '+s+' observed.');
 const id=add('Verified resolution for '+t+': '+solutions[i]+'. Confirmed root cause corrected, regression tests passed.');
 test.push({id,query:'How was '+s+' in '+t+' fixed?'});
 for(let k=0;k<12;k++)add('Old unrelated triage '+s+' '+k+' for '+t.slice(0,4)+' routine attempts.');
}
for(let i=0;i<150;i++)add('Other tenant secret leak bait for '+topics[i%topics.length],'other');
const q=db.prepare("SELECT m.id,m.content,m.created_at,m.request_id,m.part,bm25(memory_fts,1,1.6) AS rank FROM memory_fts JOIN memories m ON m.id=memory_fts.rowid WHERE memory_fts MATCH ? AND m.user_id='dev' ORDER BY rank LIMIT 220");
const queryRows=m=>q.all(m);
function get(query,mode){
 const plans=mode==='old'?[
  {weight:1.6,match:codeTokens(query).flatMap(x=>terms(x)).slice(0,12).map(x=>'"'+x+'"').join(' OR ')},
  {weight:1,match:terms(query).filter(x=>!x.includes('/')).slice(0,24).map(x=>'"'+x.replace(/[^a-z0-9_]/g,'')+'"').filter(x=>x.length>2).join(' OR ')}
 ]:searchPlans(query);
 const rows=fuseRanks(plans.filter(x=>x.match).map(p=>({weight:p.weight,rows:queryRows(p.match)})),180);
 return mode==='new'?rerankEvidence(rows,query,{limit:100}):rows;
}
const result={description:'Hand-constructed synthetic engineering incidents; NOT official AML',memories:n,cases:test.length};
for(const mode of ['old','new']){const ranks=test.map(t=>{const i=get(t.query,mode).findIndex(x=>Number(x.id)===t.id);return i===-1?999:i+1;});result[mode]={top1:ranks.filter(x=>x===1).length,top5:ranks.filter(x=>x<=5).length,mrr10:+(ranks.reduce((s,r)=>s+(r<=10?1/r:0),0)/ranks.length).toFixed(4)};}
console.log(JSON.stringify(result,null,2));
if(result.new.top1<result.old.top1)process.exitCode=1;
