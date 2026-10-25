// Experimental coding-trajectory formation. NOT enabled in the production API.
// Produces verbatim spans from the submitted trajectory; never writes final answers.
// See VibeMemBench (2026) on the adverse effect of unfiltered transcript injection.
const OUTCOME=/\b(root cause|verified|confirmed|resolved|fix(?:ed)?|patch(?:ed)?|tests? passed|regression|reproduc(?:ed|tion)|commit(?:ted)?|workaround|successful|not the fix|failed attempt|reverted|does not work)\b/i;
const ENGINEERING=/(?:[\w.-]+\/)+[\w.-]+\.(?:py|ts|tsx|js|go|rs|java|sql|yaml|yml|json)|\b(?:Exception|Traceback|AssertionError|ERROR|FAIL|pytest|unittest|npm test|cargo test|git diff|@@)\b|^\s*[+-]\s*(?:if|return|def|class|const|let|function|async|import)\b/i;
const PROGRESS=/\b(?:decid(?:ed|e)|reason|tradeoff|because|instead|should|avoid|requires?|breaks?|fails?|changed|commit|test|migration|revert)\b/i;
export function selectCodingEvidence(input,{maxChars=12000,passthroughChars=14000}={}){
 const text=String(input||'');
 if(text.length<=passthroughChars)return{text,selected:text.length,original:text.length,compressed:false};
 maxChars=Math.max(2000,maxChars);
 const lines=text.split('\n'),offsets=[];let offset=0;
 for(const line of lines){offsets.push(offset);offset+=line.length+1;}
 const spans=[];let started=0;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];let priority=0;
  if(OUTCOME.test(line))priority+=6;
  if(ENGINEERING.test(line))priority+=3;
  if(PROGRESS.test(line))priority+=1;
  if(/^\s*(?:#|\/\/|\/\*|\*|>|- |\d+\.)/.test(line))priority+=0.2;
  if(i>lines.length*0.9)priority+=1;
  if(priority>=3){
   const lo=Math.max(0,i-1),hi=Math.min(lines.length-1,i+1);
   const a=offsets[lo],b=Math.min(text.length,offsets[hi]+lines[hi].length);
   spans.push({a,b,priority});
  }
  started++;
 }
 // Preserve some beginning/ending context even when no code markers occur.
 spans.push({a:0,b:Math.min(text.length,600),priority:3});
 spans.push({a:Math.max(0,text.length-1100),b:text.length,priority:3.5});
 spans.sort((a,b)=>b.priority-a.priority||b.a-a.a);
 const chosen=[],cap=maxChars;
 const separator='\n[Original trajectory evidence omitted to fit memory budget]\n';
 let used=0;
 for(const s of spans){
  if(used>=cap)break;
  if(chosen.some(x=>s.a>=x.a&&s.b<=x.b))continue;
  const remaining=cap-used-(chosen.length?separator.length:0);
  if(remaining<60)break;
  const b=Math.min(s.b,s.a+remaining);
  chosen.push({a:s.a,b});
  used+=b-s.a+(chosen.length>1?separator.length:0);
 }
 if(chosen.length===0)return{text:text.slice(-cap),selected:Math.min(text.length,cap),original:text.length,compressed:true};
 chosen.sort((a,b)=>a.a-b.a);
 const merged=[];
 for(const s of chosen){
  const last=merged.at(-1);
  if(last&&s.a<=last.b)last.b=Math.max(last.b,s.b);
  else merged.push({...s});
 }
 const result=merged.map(s=>text.slice(s.a,s.b)).join(separator);
 return{text:result,selected:result.length,original:text.length,compressed:true};
}
