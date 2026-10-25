// Read-only, size-bounded public VibeMemBench trajectory probe.
// Only earlier upstream issues (143, 179, 195) are inspected, never the 553 target.
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {selectCodingEvidence} from '../src/formation.js';
const base='https://huggingface.co/datasets/Tongyi-ConvAI/VibeMemBench/resolve/main/history/python/adamchainz__flake8-comprehensions';
const ids=[143,179,195];
const results=[];
for(const id of ids){
 const stem='adamchainz__flake8-comprehensions-'+id;
 const url=base+'/'+stem+'/'+stem+'.traj.json';
 let status='ok';
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const cap=12_000_000;
  if(Number(response.headers.get('content-length')||0)>cap)throw Error('file exceeds 12MB safety limit');
  const chunks=[];let size=0;
  for await(const part of response.body){
   size+=part.byteLength;
   if(size>cap)throw Error('download exceeds safety limit');
   chunks.push(part);
  }
  const raw=Buffer.concat(chunks),trace=JSON.parse(raw.toString('utf8'));
  const messages=Array.isArray(trace.messages)?trace.messages:[];
  const text=messages.map(m=>typeof m.content==='string'?m.content:'').filter(Boolean).join('\n\n');
  if(!text.length)throw Error('no text content');
  const begin=performance.now();
  const formed=selectCodingEvidence(text,{maxChars:12000,passthroughChars:14000});
  const duration=performance.now()-begin;
  results.push({id,trajectoryBytes:raw.length,messages:messages.length,textBytes:Buffer.byteLength(text),selectedBytes:Buffer.byteLength(formed.text),gzipOriginalBytes:gzipSync(text).length,selectedRatio:Number((formed.text.length/text.length).toFixed(4)),formationCpuMs:Number(duration.toFixed(2)),hasEvidence:formed.text.length>0});
 }catch(e){status=String(e.message||e);results.push({id,status});}
}
console.log(JSON.stringify({dataset:'VibeMemBench public earlier history only',targetNumber:553,results},null,2));
if(results.filter(x=>x.hasEvidence).length===0)process.exitCode=1;
