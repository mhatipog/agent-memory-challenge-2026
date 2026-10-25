// Analyze storage options on public or synthetic text only; never benchmark private evaluation data.
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {selectCodingEvidence} from '../src/formation.js';
const revision='cdc6032bf6575bd17812fd1e06ec211355d2200b';
const remote='https://raw.githubusercontent.com/pa4uslf/agentmemory-for-codex/'+revision+'/eval/data/coding-agent-life-v1/sessions.json';
const response=await fetch(remote,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('Public data unavailable: '+response.status);
const sessions=await response.json();
if(!Array.isArray(sessions)||sessions.length!==15)throw Error('Public data unexpectedly changed');
const lengths=sessions.map(s=>Buffer.byteLength(s.content)).sort((a,b)=>a-b);
const formed=sessions.map(s=>selectCodingEvidence(s.content));
const raw=sessions.reduce((sum,s)=>sum+Buffer.byteLength(s.content),0);
const compact=formed.reduce((sum,s)=>sum+Buffer.byteLength(s.text),0);
const zipped=sessions.reduce((sum,s)=>sum+gzipSync(s.content).length,0);
const sample=Array.from({length:7000},(_,i)=>'Info debug line '+i+' waiting for worker result and accumulating more stack output\n').join('')+'\nVerified root cause: race on cache key in src/user_state.py. Regression tests passed.';
const timings=[];
for(let i=0;i<20;i++){
 const before=performance.now();
 const evidence=selectCodingEvidence(sample);
 timings.push(performance.now()-before);
 if(!evidence.text.includes('Verified root cause'))throw Error('Evidence drop');
}
timings.sort((a,b)=>a-b);
const assumedTokens=1.8e9,bytesPerToken=4,rawBytes=assumedTokens*bytesPerToken;
console.log(JSON.stringify({
 type:'Public-data sizing research, not official evaluation',
 referenceSessions:15,
 referenceRawBytes:raw,
 referenceSelectedBytes:compact,
 referenceGzipBytes:zipped,
 referenceSizeRange:[lengths[0],lengths[7],lengths.at(-1)],
 syntheticInputBytes:Buffer.byteLength(sample),
 syntheticSelectedBytes:Buffer.byteLength(selectCodingEvidence(sample).text),
 syntheticP50CpuMs:Number(timings[10].toFixed(2)),
 syntheticP95CpuMs:Number(timings[18].toFixed(2)),
 extrapolation:{assumedBytesPerToken:4,nominalTokens:assumedTokens,rawGB:rawBytes/1e9,rowsAt1850Characters:Math.ceil(rawBytes/1850),d1FreeRowsPerDay:100000,d1FreePerDatabaseMB:500,r2FreeGBMonth:10},
 warning:'Hypothetical envelope only: real source distribution, concurrency and CPU must be measured'
},null,2));
