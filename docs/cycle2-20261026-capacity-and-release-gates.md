# Coding Cycle 2 capacity and release gate — 2026-10-26

**Scope:** independent engineering research, not the evaluated v0.2.0. Production Worker and credentials unchanged. Registered deployed source commit: 4b2f7a0d32eb55807cc9faf6b7b76bb644301c35.

## Verified boundaries

- Organizer application request_77b0dd8f1856404d883a received October 26; review pending, no official score.
- Official Coding suite: 300 scored attempts, approximately 1.8 billion tokens across the suite. This is aggregate, not necessarily unique memory or one Add call.
- Cloudflare D1 Free: 10 databases, 500 MB each, 5 GB total, 100,000 billed rows written/day, 50 queries per Worker invocation. Sources: https://developers.cloudflare.com/d1/platform/limits/ and https://developers.cloudflare.com/d1/platform/pricing/
- One Full is realistically available before the November 4 deadline: the second unlocks after 30 days.
- Academic/Open-source Methods permits a model-free architecture in principle only if the organizers interpret their rule accordingly. The guidance requires text-embedding-v4 for embeddings and gpt-4o-mini for LLM components; the Full checklist specifically mentions gpt-4o-mini during Add. Written clarification is required before claiming eligibility.

## New reproducible capacity envelope

Run: node scripts/capacity-envelope.mjs (Node 22). It instantiates the actual production schema.sql and SQLite FTS5, measures physical SQLite pages relative to original UTF-8 input, and compares three deterministic simulated engineering-history classes: repetitive notes, diverse identifiers, and code. Extrapolations assume four bytes per token, which is a scenario rather than a measured tokenizer ratio. This is neither a Cloudflare load test nor an official competition test.

At 1.8B tokens x 4 bytes / 1850 characters, a full literal copy could need approximately 3.9 million chunks. At 100,000 billed row writes per day, that is 39 days even before index and trigger writes. Actual requirements may be smaller with source reuse, selective memory, compaction and differing token density. Free D1 sharding alone is therefore not an evidenced fix.

## Candidate architectures, not deployed

1. Compressed R2 blob evidence plus selective D1 postings. Standard R2 free allowance is 10 GB-month, 1M write-class and 10M read-class operations per month; activation/permissions and strictly free use are unverified. Source: https://developers.cloudflare.com/r2/pricing/
2. Source-attributed episode compaction for decisions, root cause, diffs and regression outcomes. It trades recall for capacity, so validate against genuinely unseen repositories at fixed Answer token budget.
3. Existing OCI runner for offline experiments; hosting a live independent index requires separately verified HTTPS, storage, availability, privacy and recovery. No live organizer data in CI.

## Release gates

- Do not change registered API, credentials or version without organizer approval. Preserve current deploy SHA.
- Isolated candidate must pass correctness, user scope, retries, errors, concurrency and 30-day erasure tests plus 1.8B-token credible capacity projections backed by load testing.
- Compare baseline/candidate using untouched holdouts, paired tests and latency/size measurements. Never tune on leaked competition answers.
- Receive approved Eval Key, run official Smoke, certify real capacity and compliance, then run the single serious Full; preserve run receipts.
- Record current decision: Full and redeploy remain blocked; this branch is research only.
