import {chunkMessage,indexSignals,searchPlans,fuseRanks,rerankEvidence} from './retrieval.js';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function bad(status,error){return reply({error},status);}
const validStr=(x,max=400)=>typeof x==='string'&&x.length>0&&x.length<=max;
const messageOk=m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length>0&&m.content.length<=1000000&&(!('timestamp'in m)||(Number.isFinite(m.timestamp)&&Math.abs(m.timestamp)<=8640000000000000));
async function add(env,body){
 if(!validStr(body.request_id,350)||!validStr(body.user_id,350)||!validStr(body.session_id,350)||!Array.isArray(body.messages)||!body.messages.length||body.messages.length>500||!body.messages.every(messageOk))return bad(422,'Invalid Add request fields');
 const rows=[];let part=0;
 for(const m of body.messages)for(const content of chunkMessage(m)){
  rows.push({part:part++,content,signals:indexSignals(content),created_at:Number.isFinite(m.timestamp)?new Date(m.timestamp).toISOString():new Date().toISOString()});
  if(rows.length>5000)return bad(422,'Too many evidence chunks');
 }
 // JSON1 batch inserts reduce database subrequests (50 query limit on D1 Free).
 const sql="INSERT OR IGNORE INTO memories(user_id,session_id,request_id,part,content,signals,created_at) SELECT ?,?,?, CAST(json_extract(j.value,'$.part') AS INTEGER),json_extract(j.value,'$.content'),json_extract(j.value,'$.signals'),json_extract(j.value,'$.created_at') FROM json_each(?) j";
 for(let i=0;i<rows.length;i+=125){
  const payload=JSON.stringify(rows.slice(i,i+125));
  if(payload.length>500000)return bad(422,'Write batch too large');
  await env.DB.prepare(sql).bind(body.user_id,body.session_id,body.request_id,payload).run();
 }
 return reply({success:true,request_id:body.request_id,user_id:body.user_id,session_id:body.session_id});
}
async function search(env,body){
 if(!validStr(body.user_id,350)||!validStr(body.query,32000)||('options'in body&&(!Array.isArray(body.options)||body.options.some(x=>typeof x!=='string')))||!Number.isSafeInteger(body.top_k)||body.top_k<1||body.top_k>1000)return bad(422,'Invalid Search request fields');
 const top=Math.min(100,body.top_k),plans=searchPlans(body.query,body.options||[]),groups=[];
 for(const p of plans){
  const q=await env.DB.prepare('SELECT m.id,m.content,m.created_at,m.request_id,m.part,bm25(memory_fts,1.0,1.6) AS rank FROM memory_fts JOIN memories m ON m.id=memory_fts.rowid WHERE memory_fts MATCH ? AND m.user_id=? ORDER BY rank LIMIT 220').bind(p.match,body.user_id).all();
  groups.push({weight:p.weight,rows:q.results||[]});
 }
 let results=rerankEvidence(fuseRanks(groups,Math.max(top,180)),body.query,{limit:top});
 if(results.length<top){
  const seen=new Set(results.map(x=>String(x.id)));
  const fallback=await env.DB.prepare('SELECT id,content,created_at,request_id,part FROM memories WHERE user_id=? ORDER BY id DESC LIMIT 140').bind(body.user_id).all();
  for(const r of fallback.results||[]){
   if(results.length>=top)break;
   if(!seen.has(String(r.id))){results.push({id:String(r.id),content:r.content,score:0,created_at:r.created_at,request_id:r.request_id,part:r.part});seen.add(String(r.id));}
  }
 }
 // Context-rescue: recover original neighboring evidence from the same request and user only.
 for(const r of results.slice(0,16)){
  if(typeof r.part!=='number'||!r.request_id)continue;
  const q=await env.DB.prepare('SELECT part,content FROM memories WHERE user_id=? AND request_id=? AND part BETWEEN ? AND ? ORDER BY part').bind(body.user_id,r.request_id,r.part-1,r.part+1).all();
  const rows=q.results||[],before=rows.find(x=>x.part===r.part-1),after=rows.find(x=>x.part===r.part+1);
  r.content=(before?'[Adjacent preceding evidence]\n'+before.content.slice(-350)+'\n':'')+r.content+(after?'\n[Adjacent following evidence]\n'+after.content.slice(0,550):'');
 }
 return reply({data:results.map(({id,content,score,created_at})=>({id,content,score,created_at}))});
}
export default {
 async scheduled(controller,env) {
  if(env.DB)await env.DB.prepare("DELETE FROM memories WHERE ingested_at < datetime('now','-29 days')").run();
 },
 async fetch(req,env){
  const path=new URL(req.url).pathname;
  if(req.method==='GET'&&path==='/health')return reply({status:'ok',system:'CodeMemory-FTS',version:'0.2.0'});
  if(req.method!=='POST'||!['/add','/search'].includes(path))return bad(404,'Not found');
  if(!env.DB)return bad(503,'Database binding unavailable');
  if(!env.MEMORY_API_KEY&&env.ALLOW_PUBLIC_SMOKE!=='true')return bad(503,'API auth not configured');
  if(env.MEMORY_API_KEY){
   const key=req.headers.get('x-api-key')||req.headers.get('authorization')?.replace(/^(Bearer|Token)\s+/i,'');
   if(key!==env.MEMORY_API_KEY)return bad(401,'Unauthorized');
  }
  if(Number(req.headers.get('content-length')||'0')>12000000)return bad(413,'Request too large');
  let body;try{body=await req.json();}catch{return bad(400,'Invalid JSON');}
  try{return path==='/add'?await add(env,body):await search(env,body);}
  catch(e){return bad(503,'Memory backend temporarily unavailable');}
 }
}