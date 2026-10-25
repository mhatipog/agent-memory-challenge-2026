// Protocol compatibility audit. Current deployed source is deliberately not modified.
// No organizer/private evaluation data or secrets involved.
import worker from '../src/worker.js';
const DB={prepare(){throw Error('DB must not be accessed for rejected payload')}};
const env={DB,MEMORY_API_KEY:'local-audit'};
const send=async(body,headers={})=>{
 const r=await worker.fetch(new Request('https://local/add',{method:'POST',headers:{'X-Api-Key':'local-audit',...headers},body:JSON.stringify(body)}),env);
 return r.status;
};
const standard={request_id:'r',session_id:'s',user_id:'u',messages:[{role:'user',content:'valid'}]};
const oversized=[...Array(501)].map(()=>({role:'user',content:'valid'}));
const results=[
 {case:'ordinary envelope',status:await send(standard),note:'DB calls expected; 503 confirms attempted backend'},
 {case:'501 small valid user messages',status:await send({...standard,messages:oversized}),note:'422 exposes undocumented per-Add cap'},
 {case:'one valid message slightly over 1 million chars',status:await send({...standard,messages:[{role:'user',content:'v'.repeat(1000001)}]}),note:'422 exposes local per-message cap'},
 {case:'claimed 12MB request',status:await send(standard,{'content-length':'12000001'}),note:'413 exposes arbitrary request body cap'}
];
console.log(JSON.stringify({kind:'Non-organizer API boundary check',results},null,2));
if(results[1].status!==422||results[2].status!==422||results[3].status!==413)process.exitCode=1;
