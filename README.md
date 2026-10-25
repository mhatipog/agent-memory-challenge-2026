# CodeMemory-FTS — Agent Memory Challenge 2026

An open-source, evidence-only memory API for the **Coding Memory** track of the [Agent Memory Challenge 2026](https://agentmemoryleaderboard.ai/competition/). The service never produces answers; it stores raw engineering history, searches evidence, and lets the organizers' Answer/Eval system handle response generation and scoring.

**Status 25 October 2026:** local implementation and offline tests completed. No official score, organizer acceptance, or prize has been achieved. Deployment is pending cloud access and provisioned database details.

## Approach

- Cloudflare Worker + D1 SQLite FTS5/BM25, with code-identifier aliases and a weighted reciprocal-rank fusion of symbol, language, and option searches.
- Chunk-preserving original messages with overlapping windows. No generated or fabricated memory records.
- User-scoped storage and retrieval; retry-idempotent Add requests; secure key support and 29-day retention by ingestion date.
- No LLM or embedding model at Add/Search. The contest Open-source Methods rules mandate specific models *if* an LLM or embedding is used.
- Techniques (BM25, FTS5, rank fusion and token splitting) are established methods, not claimed as original.

## Quickstart

Node 22+ for offline SQLite-backed integration tests.

    npm test
    npm run bench

The synthetic benchmark is a **local regression fixture**, not the official AML benchmark. Its rank/retrieval numbers must not be interpreted as performance against the private CAMBench suite.

### Deploy

1. Create a dedicated Cloudflare D1 database: npx wrangler d1 create codememory-aml-2026.
2. Replace REPLACE_WITH_D1_DATABASE_ID in wrangler.jsonc with the new database UUID.
3. Initialize tables using: npx wrangler d1 execute codememory-aml-2026 --remote --file=schema.sql.
4. Store a dedicated API secret with: npx wrangler secret put MEMORY_API_KEY.
5. Deploy: npx wrangler deploy. Check GET /health; test POST /add and /search, user isolation and Add retries.

## API

POST /add: {request_id, user_id, session_id, messages:[{role, content, timestamp?}]}.
Response: {success:true,request_id,user_id,session_id}.

POST /search: {query, options?, user_id, top_k:100}.
Response: {data:[{id,content,score,created_at}]} in rank order.

Authenticate with X-Api-Key, Authorization: Bearer, or Token when the secret is configured. Health is unauthenticated.

## Submission

- [x] Local implementation and tests
- [x] Public source
- [ ] Live deployed Add/Search endpoints
- [ ] Organizer evaluation application and key
- [ ] Official Smoke + Full review and published score

Materials deadline: **October 31, 2026, 23:59 UTC+8**. An online Add/Search service and organizer submission are both required; merely publishing GitHub code does not enter the competition.

## Limitations

Exact code strings work well with lexical search; semantic paraphrases with no token overlap may be missed. Capacity on free Cloudflare tiers is unverified against full competition volume (organizer cites approximately 1.8 billion tokens of coding evaluation data across the suite). No cloud cost, formal trial, or award should be assumed. All organizer evaluation data must remain private and must be deleted within 30 days. MIT license.
## October 25 retrieval upgrade — v0.2

Comparative research: [MemoraX Code](https://github.com/memorax-ai/memorax-code) distinguishes coding lessons and repository knowledge. [MemCode (October 2026)](https://arxiv.org/abs/2610.19472) studies atomic associative memories; [HippoRAG 2](https://arxiv.org/abs/2502.14802) explores evidence association and [EvalLLM 2026](https://arxiv.org/abs/2609.34776) evaluates query decomposition. This implementation does not claim to reproduce their models or use their code.

New: code identifier decomposition, lexical domain expansion, multi-term FTS, positive-versus-failed-history reranking, adjacent source evidence, authenticated-by-default API, and JSON1 bulk Add inserts to stay within D1 query limits.

**Synthetic stress test** (44 cases/584 memories; compare `npm run bench:hard`): BM25 14/44 top-1, original rank fusion 30/44 top-1, updated verified-fix reranker 43/44 top-1. This synthetic fixture is intentionally constructed for engineering repair-history confusion, not a representative prediction of CAMBench or an official leaderboard result.

**Deployment risk:** official coding evaluation reports very large memory volume; Cloudflare D1 Free limits an individual database to 500 MB. A free-tier D1 deployment may pass Smoke but is unlikely to complete Full without capacity engineering. No official submission or prize is claimed.
