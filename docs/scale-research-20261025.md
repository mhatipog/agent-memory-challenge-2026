# Agent Memory Challenge — coding-memory scale and evidence audit

**Research date:** 25 October 2026. **Research branch only; not deployed.** The submitted / frozen live service remains pinned to `4b2f7a0d32eb55807cc9faf6b7b76bb644301c35`. None of the experimental features below has an official AML score.

## Latest public sources

- [AML official API contract](https://agentmemories.ai/api-guide): participant Add and Search must comply for Coding trajectories; an individual call may take up to 30 minutes; successful Add must be durably searchable before HTTP 200.
- [AML competition](https://agentmemoryleaderboard.ai/competition/): 300 scored Coding instances (150 tasks), approximately **1.8 billion** input tokens for the track in total; this is aggregate, **not** a single request.
- [Cloudflare Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/): 10 ms CPU per request, 100k requests/day, 128 MB memory, account-plan-dependent request size up to 100 MB.
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/): 500 MB/database on Free, max ten databases. [Daily rows](https://developers.cloudflare.com/d1/platform/pricing/): 100,000 written/day and 5 million read/day **across the account**, enforced since September 2026.
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/): included Standard storage 10 GB-month, 1m Class A and 10m Class B operations monthly. [Setup requires an R2 subscription checkout](https://developers.cloudflare.com/r2/get-started/), with billable overage possible. Do not enable without cost authorization.
- [VibeMemBench](https://huggingface.co/datasets/Tongyi-ConvAI/VibeMemBench), September 2026, Apache-2.0 data: 111 coding targets from 90 repositories and 3,634 history trajectories (2.2 GB). Official upstream causal rule: only use earlier issues in the same repository, not the target's own history.
- [MemoraX Code](https://github.com/memorax-ai/memorax-code) distinguishes code lessons, repo facts, personal preferences and procedures; uses a compact context budget. The **Cycle 1** AML Coding leader MemoraX v0.5 was reported at **62%** overall. These are not our own results.
- [MemCode](https://arxiv.org/abs/2610.19472) and [ACON](https://proceedings.mlr.press/v306/kang26b.html) motivate associative memory and compression, but trained/codebook methods are not presently reproduced here.

## Critical incompatibilities in current frozen v0.2

`src/worker.js` imposes local caps of 12 MB by declared Content-Length, 500 messages, 1 million characters/message and 5,000 indexed chunks per Add; none is guaranteed by the official Coding contract. The Add implementation performs synchronous SQLite writes and FTS triggers, which risk timeout or quota exhaustion for long trajectories. Free Workers' 10 ms CPU allowance is also a problem before adding text segmentation and ranking overhead. Use `node scripts/contract-audit.mjs` for reproducible prefilter boundary checks. Do **not** weaken production protections or claim readiness without testing a safe streaming/backpressure path.

## Quantified scale envelope

An illustrative assumption of 4 bytes/token places the published aggregate 1.8B tokens near 7.2 GB plain text, excluding FTS amplification, metadata, duplicate trajectories and prompts. At 1,850 characters per stored row that is approximately 3.89 million rows, roughly **39 whole days of the D1 Free account's 100k daily written rows** if all were processed this way. This is a capacity illustration, **not** a measurement of how the official harness partitions or concurrently ingests data.

### Separate public-data experiments

Pinned third-party `coding-agent-life-v1` fixture is **only 3,200 total bytes** across 15 histories; it is a retrieval correctness smoke, not a capacity assessment (12/15 top-1 for both BM25 and hybrid).

A separate **real** earlier-history probe used 3 VibeMemBench trajectories under `adamchainz/flake8-comprehensions` (PR 143, 179, 195), avoiding target 553 and its future data:

| Earlier task | JSON trajectory | Text messages | Verbatim evidence selected (prior to cap correction) | Measured selection CPU |
| --- | ---: | ---: | ---: | ---: |
| 143 | 307,362 B | 72,400 B | 14,029 B | 6.18 ms |
| 179 | 206,531 B | 55,074 B | 9,041 B | 2.45 ms |
| 195 | 213,624 B | 47,516 B | 7,949 B | 1.35 ms |

The selector is deterministic, extracts original spans and does not write generated fixes. The test proves neither recall preservation nor future-code-solving uplift. Original text compressed with gzip over the three cases totals approximately 33 KB, already comparable to the **31 KB** selected text, showing that a raw compressed R2 archive could retain more provenance for a similar amount of storage.

A separate repetitive **synthetic** 573 KB log shrank to ~1.8 KB with P50 5.76 ms and P95 8.18 ms for the selector *alone*. This may approach the Free Workers' entire 10 ms CPU allowance; production JSON parsing and D1 operations add overhead. **Do not extrapolate the synthetic compression factor to real traces.**

CI evidence: [2026-10-25 public sizing](https://github.com/mhatipog/agent-memory-challenge-2026/actions/runs/40194470059), [real coding trajectories](https://github.com/mhatipog/agent-memory-challenge-2026/actions/runs/40194701327).

### Existing infrastructure read-only audit

[Read-only audit run](https://github.com/mhatipog/web-operations/actions/runs/40194735701) verified dedicated AML D1 database visibility and confirmed R2 bucket listing unavailable with the current credential. That does not distinguish insufficient token permission from an unenabled subscription. No resource was provisioned and no paid tier was activated.

## Candidate architecture, not implemented

1. Tier 1: small task/repository/decision/validated-fix evidence records in D1, indexed by code symbol and error/patch characteristics. Include provenance and negative lessons distinctly; default to a compact Search response.
2. Tier 2: complete, original trajectories in compressed R2 objects, retrievable only by user scope and known provenance. Treat gzip size and P95 CPU honestly. Enforce 30-day deletion and no permanent evaluation logs.
3. On Add: robust streaming or bounded batching with idempotent request_id, atomically coordinated R2 + D1 commits, honest HTTP errors, and no 200 before data is searchable. Validate actual payload and write/concurrency volume before Full.
4. On Search: search compact summaries, fetch original neighboring evidence on demand, never reconstruct or fabricate unobserved facts, obey Top K=100.
5. Only promote to frozen deployed branch after independent real-history retrieval tests, contract/load evaluation, and organizer-authorized Smoke pass.

## Next evidence gates

- Assess memory-quality retention by using real, causally valid VibeMemBench query/history pairs and gold *history relevance* where legitimately available; don't use hidden solution patches/target trajectories.
- Establish access to R2 via a dedicated least-privilege token or identify a zero-cost alternative. Subscription checkout may permit billing; obtain explicit approval before enabling it.
- Do not submit an organizer Full until a real storage budget, throughput, concurrency and consistent Add/Search semantics are demonstrated.
- The official Evaluation Access Request and issued Eval Key are still unverified as of this research note. Emailing organizers is not registration.

**Decision:** Keep deployed v0.2 intact, measure a genuinely scaled tiered design off-production and prioritize complete evaluation eligibility ahead of synthetic ranking tweaks.
