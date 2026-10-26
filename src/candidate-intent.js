/** Experimental, source-preserving intent-conditioned reranker.
 * Not wired into the registered v0.2.0 Worker. Compare before release.
 */
import {rerankEvidence} from './retrieval.js';
const FAILURE_QUESTION=/\b(?:what|which|why|how|where|when)\b.{0,85}\b(?:fail(?:ed|ure|ures)?|broken|unsuccessful|revert(?:ed)?|rollback|rolled back|did not work|didn't work|abandon(?:ed)?|reject(?:ed)?)\b|\b(?:failed|unsuccessful|abandoned|reverted|rolled back)\b.{0,80}\b(?:attempt|approach|solution|patch|change|implementation|experiment|fix)\b|\b(?:previous|earlier)\b.{0,45}\b(?:failed|unsuccessful)\b/i;
const CURRENT_QUESTION=/\b(?:final|currently|latest|resolved|working|successful|confirmed)\b.{0,65}\b(?:fix|patch|approach|implementation|solution|resolution|status)\b|\b(?:how|what)\b.{0,65}\b(?:fixed|resolved|corrected)\b/i;
const SUCCESS_EVIDENCE=/\b(?:verified|confirmed|resolved|root cause|regression (?:tests? )?pass(?:ed)?|successful(?:ly)?|fixed by|validated fix|final fix|tests passed|approved solution)\b/i;
const FAILURE_EVIDENCE=/\b(?:failed attempt|did not (?:work|fix)|does not (?:work|fix)|unsuccessful|reverted|rolled back|not the fix|still broken)\b/i;
export function codingMemoryIntent(query){
  const q=String(query||'');
  // A current/final-state question overrides ambiguous mentions of prior failure.
  return CURRENT_QUESTION.test(q)?'current':FAILURE_QUESTION.test(q)?'failure':'neutral';
}
export function rerankByHistoryIntent(rows,query,{limit=100}={}){
 const n=Math.max(1,Math.min(1000,limit));
 const base=rerankEvidence(rows,query,{limit:Math.max(n,rows.length)});
 const intent=codingMemoryIntent(query);
 if(intent==='neutral'||intent==='current')return base.slice(0,n);
 return base.map((r)=>{
  const hasSuccess=SUCCESS_EVIDENCE.test(r.content);
  const hasFailure=FAILURE_EVIDENCE.test(r.content);
  // Undo v0.2's universal success/failure priors, then favor historical
  // negative evidence only when the *question* explicitly requests it.
  const adjustment=(hasSuccess&&!hasFailure?-0.068:0)+(hasFailure&&!hasSuccess?0.05+0.060:0);
  return {...r,score:+(r.score+adjustment).toFixed(8)};
 }).sort((a,b)=>b.score-a.score||Number(b.id)-Number(a.id)).slice(0,n);
}
