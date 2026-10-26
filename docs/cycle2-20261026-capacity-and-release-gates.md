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

## October 26 measured research results (public CI)

All tests below passed in GitHub Actions; they are **not** an official AML Smoke, Full or source-deployment validation.

- Research workflow: https://github.com/mhatipog/agent-memory-challenge-2026/actions/runs/40346791880
- The baseline retrieval-vs-gzip-sparse experiment used 15 coding-memory questions from the pinned Apache-2.0 third-party fixture: both versions top-1 12/15, Recall@5 0.9667, MRR@10 0.8889. Its small 15-session SQLite DB shrank from 57,344 to 45,056 bytes (21.4%). Exact matched scores on 15 questions are not evidence of noninferiority or scalability.
- 1,200-record synthetic samples with the compressed BLOB plus bounded sparse FTS strategy (projected at four bytes per token; no official data):
  - Repetitive text: 0.339 times raw bytes, or approximately 2.44 GB aggregate.
  - Code-heavy text: 0.438 times raw bytes, or approximately 3.16 GB aggregate.
  - Diverse high-cardinality identifiers: 2.215 times raw bytes, or approximately 15.95 GB aggregate. **This is a regression, not a valid capacity solution.**
- All three compressed scenarios still use one indexed row per synthetic evidence record; D1 daily write quotas and maximum 500 MB per database remain unproven. Compression-by-itself is not sufficient.
- Private live probe (safe test identities and eight Add requests / four workers): https://github.com/mhatipog/web-operations/actions/runs/40345429222 , succeeded: health v0.2.0, unauthorized Search rejected, duplicate Add retry, authenticated Search and cross-user isolation. Maximum observed Add time 725ms. This is not a load test.
- Read-only R2 ListBuckets failed with current Cloudflare account/token; reason could be subscription or token permission. No R2 provisioning, paid service, production deployment or credential rotation happened.
- Initial Python urllib User-Agent on the workers.dev hostname received HTTP 403 even for /health; descriptive User-Agent resolved it. Cloudflare documents such Browser Integrity Check behavior: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/ . Organizer-client compatibility therefore needs its own Smoke confirmation.
- The official guide states no global Add character cap and requires explicit failure on unsupported requests: https://agentmemories.ai/api-guide . Production v0.2 has defined 12MB request size, 1M characters per message and at most 5,000 chunks per Add. The organizer's actual Coding payload distribution remains unknown; its maximum must be proven compatible during approved Smoke and load testing.

**Decision:** Research indicates gzip+BLOB selective indexing can sometimes save storage without losing the small fixture's retrieval scores, but high-entropy identifier history and free D1 daily write quotas remain blockers. The compressed implementation is an offline prototype only. Keep registered version 0.2.0 frozen; obtain organizer approval and eligibility interpretation before proposing an alternative.
