# Coding Agent Memory: Competitors, Evidence, and Winning Hypotheses (2026-10-25)

## Competition status and baseline

The official first-cycle **Coding Memory** table at https://agentmemories.ai/ lists MemoraX v0.5 (62.00% coding tasks resolved), claude-mem v12.1.1 (52.00%), MemOS v2.0.1 (52.00%), mem0-api v3 (51.33%) and others. These task-resolution scores **cannot be compared to local retrieval Recall@k**, and the second-cycle final table is not yet available.

**Our version:** public https://github.com/mhatipog/agent-memory-challenge-2026; pinned deployed executable SHA `4b2f7a0d32eb55807cc9faf6b7b76bb644301c35`. No official AML score or accepted entry. No evidence that we beat any named competitor.

## Reproducible local evidence

| Corpus | Baseline | Current hybrid | Interpretation |
| --- | ---: | ---: | --- |
| 30 synthetic routine coding questions, 730 memories | 30/30 top-1 | 30/30 top-1 | Trivial saturation, no lift |
| 30 adversarial but hand-constructed repair questions, 570 memories | 28/30 top-1 | 28/30 top-1 | Tied after removing an answer-bearing cue; no lift |
| Third-party `coding-agent-life-v1`, 15 cases, 15 sessions | 12/15 top-1; 0.9667 mean Recall@5 | 12/15 top-1; 0.9667 mean Recall@5 | Independently published **data**, our own evaluation protocol; no lift |

Third-party fixture: https://github.com/pa4uslf/agentmemory-for-codex/tree/cdc6032bf6575bd17812fd1e06ec211355d2200b/eval/data/coding-agent-life-v1 (Apache-2.0). The third-party corpus's 15 fictional sessions are smaller and cleaner than an official coding-agent memory benchmark. No comparison with its authors' published results is implied.

Evidence: https://github.com/mhatipog/agent-memory-challenge-2026/actions/runs/40187002334 and https://github.com/mhatipog/agent-memory-challenge-2026/actions/runs/40186878792 .

## Latest research: relevant methods, and why we cannot yet claim their effects

1. **REM: What to Store, When to Recall, What to Forget in Experience Memory for Coding Agents** (preprint posted 19 Oct 2026), arXiv:2610.27377. Phase-structured trajectories, retrieval at distinct task stages and selective ephemeral implementation-record exposure. Reported SWE-ContextBench Lite task success 27.6% versus 24.9%, with about 17% lower cost; strong relevance, but our Add/Search API cannot control in-loop timing.
2. **APEX-EM: Non-Parametric Online Learning for Autonomous Agents via Structured Procedural-Episodic Experience Replay** (EMNLP 2026): https://aclanthology.org/2026.findings-emnlp.1996/ . Structured procedure/event memories, semantic matching and structural signatures, including successful and failed trajectories. Our plain FTS records are not procedural graphs.
3. **Ask Only When Needed: Proactive Retrieval from Memory and Skills for Experience-Driven Lifelong Agents** (EMNLP 2026): https://aclanthology.org/2026.findings-emnlp.775/ . Retrieval-time decision policies and feedback-based memory refinement; agent-environment control is outside the AML Add/Search interface.
4. **From Recall to Forgetting: Benchmarking Long-Term Memory for Personalized Agents** (ACL Findings 2026): https://aclanthology.org/2026.findings-acl.1337/ . Shows the need to track obsolete and invalidated facts, analogous to failed/superseded software fixes. We currently use shallow explicit-success/failure text cues, not reliable versioned supersession.
5. **Agent Retrieval Bench** (July 2026) and **VibeMemBench** (September 2026): emphasize retriever-specific tradeoffs and that better memory retrieval does not reliably improve end-task solving. Evaluate *task resolution* under a fixed agent, not just Recall@k.

## Highest-value experiments (not completed)

- Extract repository paths, symbols, patch outcomes and failure/success version lineage; retain original source evidence. Compare episodic, procedural, and raw evidence at a fixed Answer token budget.
- Compare neural dense retrieval and lexical-only on a large **independent** coding corpus. Any embedding/LLM for Open-source Methods must satisfy organizer model restrictions and declared compute budget.
- Do not hard-code expected gold answers, use held-out private competition data for model selection, or add prompt injection to memory content.
- Run the official organizer Smoke and Full; optimize on permissible public evidence only.

## Practical blockers and race against deadline

Organizer advertises around **1.8B coding evaluation tokens** across the scored coding benchmark (source: https://agentmemories.ai/competition/). A single Cloudflare D1 Free database permits **500 MB**, so live smoke passing is not proof of Full capacity. Existing OCI host has ~6.6 GB free root disk and ~10 GiB available RAM. A deterministic Add implementation is **not yet confirmed prize-eligible**; the public Full checklist expects gpt-4o-mini during Add. Eligibility/capacity clarification was emailed to the organizer on Oct 25 (do not disclose keys). Submit complete materials by Oct 31 23:59 UTC+8; evaluation ends Nov 4. Formal portal only: https://agentmemories.ai/evaluation .