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