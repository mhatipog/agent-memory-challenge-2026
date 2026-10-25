// Evidence-only search with FTS5/BM25 and weighted reciprocal rank fusion.
const STOP = new Set('a an the and or of in to is are was were for by with if this that those these where what which why how when who can could do does did we you i our my it its be been have has had as on from into about using use used code project task issue fix bug tests test function make change please should would will at after before recent previous same relevant under'.split(' '));
export function terms(text) {
 const src=String(text||'').slice(0,16000);
 const spl=src.replace(/([a-z\d])([A-Z])/g,'$1 $2').replace(/([A-Z])([A-Z][a-z])/g,'$1 $2');
 const raw=[...src.matchAll(/[A-Za-z][\w./:-]{2,100}|\d{2,}/g)].map(x=>x[0].toLowerCase());
 const splits=[...spl.matchAll(/[\p{L}\p{N}]{3,}/gu)].map(x=>x[0].toLowerCase());
 return [...new Set([...raw,...splits].filter(x=>x.length>=3&&!STOP.has(x)&&x.length<100))];
}
export function codeTokens(text) {
 const matches=String(text||'').match(/(?:[a-zA-Z_][\w$]*[./\\:][\w./\\:$-]+|[a-zA-Z_][\w$]*(?:_[\w$]+)+|[a-zA-Z]+[A-Z][a-zA-Z\d]+|[A-Z][A-Z0-9_]{3,}|[A-Za-z]+Error|[\w-]+\.(?:py|js|ts|tsx|go|rs|java|sql|yaml|json|md|toml))/g)||[];
 return [...new Set(matches.map(x=>x.toLowerCase()).filter(x=>x.length>3))].slice(0,70);
}
export function indexSignals(text) {
 const ids=codeTokens(text);
 const rawIds=String(text||'').match(/(?:[a-zA-Z_][\w$]*[./\\:][\w./\\:$-]+|[a-zA-Z_][\w$]*(?:_[\w$]+)+|[a-zA-Z]+[A-Z][a-zA-Z\d]+|[A-Z][A-Z0-9_]{3,})/g)||[];
 const derived=[...ids.flatMap(x=>x.split(/[./\\:_$-]+/)),...rawIds.flatMap(x=>terms(x))].filter(x=>x.length>=3);
 return [...new Set([...ids,...derived])].slice(0,250).join(' ');
}
export function chunkMessage(message,maxChars=1850) {
 const c=typeof message.content==='string'?message.content:'';
 if(!c)return [];
 const prefix=String(message.role||'user')+(Number.isFinite(message.timestamp)?' @ '+new Date(message.timestamp).toISOString():'')+'\n';
 const max=Math.max(180,maxChars-prefix.length);
 if(c.length<=max)return[prefix+c];
 const chunks=[];let start=0;
 while(start<c.length) {
  let end=Math.min(c.length,start+max);
  if(end<c.length){
   let boundary=c.lastIndexOf('\n',end);
   if(boundary<start+Math.floor(max*.55))boundary=c.lastIndexOf(' ',end);
   if(boundary>=start+Math.floor(max*.55))end=boundary+1;
  }
  chunks.push(prefix+c.slice(start,end));
  if(end>=c.length)break;
  start=Math.max(start+1,end-130);
 }
 return chunks;
}
function quoteToken(token){
 const safe=String(token).replace(/[^\p{L}\p{N}_]/gu,' ');
 return safe.split(/\s+/).filter(t=>t.length>=3).map(w=>'"'+w.replace(/"/g,'')+'"').join(' OR ');
}
const RELATED={crash:['exception','error'],hang:['deadlock','timeout'],stuck:['deadlock','timeout'],stale:['cache','invalidate','refresh'],leak:['isolation','exposure'],race:['concurrent','locking'],retries:['backoff'],retry:['backoff'],duplicate:['idempotent'],pagination:['cursor'],slow:['latency','performance'],invalid:['validation'],broken:['failure'],outdated:['stale','refresh']};
export function searchPlans(query,options=[]){
 const ids=codeTokens(query).flatMap(x=>[x,...x.split(/[./\\:_$-]+/)]);
 const core=[...new Set(ids.flatMap(x=>terms(x)))].slice(0,12);
 const plain=terms(query).filter(x=>!x.includes('/')&&!x.includes('.')).slice(0,30);
 const extra=terms(Array.isArray(options)?options.join(' '):'').slice(0,16);
 const expanded=[...new Set(plain.flatMap(x=>RELATED[x]||[]))].filter(x=>!plain.includes(x)).slice(0,12);
 const plans=[];
 const emit=(weight,tokens,operator='OR')=>{
  const safe=[...new Set(tokens.flatMap(t=>quoteToken(t).split(' OR ')))].filter(Boolean).slice(0,28);
  if(safe.length)plans.push({weight,tokens,match:safe.join(' '+operator+' ')});
 };
 if(core.length){emit(2.6,core.slice(0,3),'AND');emit(1.7,core.slice(0,10));}
 if(plain.length>=3)emit(1.8,plain.slice(0,3),'AND');
 if(plain.length>=2)emit(1.3,plain.slice(0,2),'AND');
 emit(1.0,plain.slice(0,25));
 if(expanded.length)emit(0.42,expanded);
 if(extra.length)emit(0.20,extra);
 return plans;
}
export function fuseRanks(groups,limit=100){
 const hits=new Map();
 for(const group of groups)for(let i=0;i<group.rows.length;i++){
  const row=group.rows[i],id=String(row.id);
  const old=hits.get(id)||{row,score:0,seen:0};
  old.score+=group.weight/(50+i+1);old.seen++;hits.set(id,old);
 }
 return [...hits.values()].sort((a,b)=>b.score-a.score||b.seen-a.seen||Number(b.row.id)-Number(a.row.id)).slice(0,limit).map(x=>({...x.row,id:String(x.row.id),score:x.score}));
}
export function rerankEvidence(rows,query,{limit=100}={}){
 const q=terms(query).filter(x=>x.length>3),symbols=codeTokens(query),qset=new Set(q);
 const ranked=rows.map(r=>{
  const c=String(r.content||''),s=c.toLowerCase(),hit=new Set(terms(c));
  const overlap=qset.size?[...qset].filter(x=>hit.has(x)).length/Math.max(2,qset.size):0;
  const sym=symbols.filter(t=>s.includes(t)).length;
  const verified=/\b(verified|confirmed|resolved|root cause|regression (?:tests? )?pass(?:ed)?|successful(?:ly)?|fixed by|validated fix|final fix|tests passed|approved solution)\b/i.test(c);
  const failed=/\b(failed attempt|did not (?:work|fix)|does not (?:work|fix)|unsuccessful|reverted|rolled back|not the fix|still broken)\b/i.test(c);
  // Source status is a strong evidence-quality signal, especially when
  // repeated failed attempts copy most of the same issue-description words.
  // Never treat either term as ground truth: preserve all raw evidence.
  const score=Number(r.score||0)+(verified&&!failed?0.068:0)-(failed&&!verified?0.050:0)+Math.min(overlap,1)*0.010+Math.min(sym,3)*0.007;
  return {...r,score};
 }).sort((a,b)=>b.score-a.score||Number(b.id)-Number(a.id));
 const selected=[],duplicates=[];
 for(const r of ranked){
  if(selected.length>=limit)break;
  const dup=selected.some(s=>r.content===s.content);
  if(dup)duplicates.push(r);else selected.push(r);
 }
 for(const r of duplicates){if(selected.length>=limit)break;selected.push(r);}
 return selected.slice(0,limit).map(({id,content,score,created_at,request_id,part})=>({id:String(id),content,score:+score.toFixed(8),created_at,request_id,part}));
}
