# Offline Finance Assistant Strategy

This document summarizes the current AI assistant architecture in WealthWise and the recommended direction for prompts, models, and tools.

## Goal

Keep the assistant offline by default, improve answer quality for both budget coaching and transaction understanding, and preserve a clean path from iOS-first experiences to later Android parity.

## Current state

- `app/(tabs)/insights.tsx` runs the main assistant UX and currently builds one large `assistantContextBlock` from summary data, category breakdowns, recent transactions, and insight docs.
- `context/RAGContext.tsx` initializes the current on-device stack with `react-native-rag` and `react-native-executorch`, using `ALL_MINILM_L6_V2` embeddings and `LFM2_5_1_2B_INSTRUCT_QUANTIZED` for chat.
- `lib/ai/appleBudgetChat.ts` already has an iOS-native finance tool loop with `fetchBudgetContext`.
- `lib/ai/insightsIntentRouter.ts` already short-circuits several frequent money questions with deterministic responses.
- `lib/ai/categorizer.ts` already uses a good hybrid pattern for categorization: saved rules, token heuristics, and vector similarity.

## Main finding

The biggest improvement is not simply swapping models. The assistant should become more **grounded and tool-driven**:

1. Keep deterministic routing for common finance questions.
2. Replace the single long context blob with tagged evidence sections.
3. Prefer structured budget-data retrieval over prompt stuffing.
4. Use small structured outputs for categorization and UI-driven responses.

## Recommended architecture

### Primary iOS path

Use **Apple Foundation Models** on supported devices for the main conversational assistant.

Why:

- fully on-device
- built-in structured output support
- built-in tool-calling support
- no separate model download for supported devices

Tradeoff:

- gated to Apple Intelligence capable devices and supported OS versions

Reference:

- `@react-native-ai/apple`
- <https://docs.developer.apple.com/tutorials/data/documentation/foundationmodels.md>

### Cross-platform fallback

Keep **ExecuTorch** as the default offline fallback for unsupported iOS devices and future Android support.

Recommended chat model shortlist:

1. **Qwen2.5-1.5B-Instruct** - best candidate to prototype first for stronger instruction following and structured output behavior
2. **LFM2.5-1.2B-Instruct** - lowest-friction option because the app already uses the Liquid path
3. **Llama 3.2 1B Instruct** - smaller fallback if quality is acceptable and footprint needs to stay minimal

References:

- `react-native-executorch`
- <https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct>

## Prompt strategy

### Recommended structure

Split assistant context into clearly labeled sections instead of one prose block:

```text
SYSTEM
- role
- hard rules
- safety boundaries
- clarification policy
- output format

CONTEXT
<summary>...</summary>
<categories>...</categories>
<recent_transactions>...</recent_transactions>
<signals>...</signals>
<tool_results>...</tool_results>

TASK
User: {question}
```

### Prompt rules

- answer only from provided context or tool results
- prefer the current month unless the user asks otherwise
- do not invent amounts, categories, or trends
- if key context is missing, ask one short follow-up question
- use `$X,XXX.XX` formatting
- do not expose ids, raw traces, or prompt fragments

### UX guardrails

- keep disclaimers conditional, not constant
- only mention tax/legal/investment boundaries when the user crosses into those areas
- state uncertainty plainly instead of padding with generic advice

## Tooling strategy

### Keep

- deterministic router for exact high-frequency questions
- local vector retrieval for narrow evidence slices
- app-owned finance tools instead of giving the model raw database access

### Expand

The finance tool contract should become the canonical grounding layer for all runtimes.

Good candidates to add:

- budget trend by month
- uncategorized transaction lookup
- likely category candidates for one transaction
- ranked savings opportunities by variance

### Categorization output

Return a structured result for non-trivial categorization decisions:

```json
{
  "categoryId": 12,
  "confidence": 0.74,
  "topCandidates": [{ "id": 12, "score": 0.74 }],
  "needsClarification": false,
  "reason": "vector + merchant rule"
}
```

## Evaluation criteria

Use the same rubric for prompt changes and model experiments:

- groundedness to local finance data
- numerical accuracy
- month/timeframe correctness
- clarification quality
- categorization accuracy
- latency
- RAM and download size
- safety without awkward UX

## Recommended evaluation stack

1. A private JSONL dataset of real app questions and expected answers
2. `promptfoo` for prompt and model comparisons
3. Phoenix only if experiment tracking and tracing become necessary

Public benchmarks can help with stress testing, but the final evaluation should stay grounded in WealthWise-specific scenarios.

Useful references:

- <https://github.com/promptfoo/promptfoo>
- <https://github.com/Arize-ai/phoenix>
- <https://github.com/patronus-ai/financebench>

## Concrete next steps

1. Refactor `app/(tabs)/insights.tsx` to replace the monolithic `assistantContextBlock` with tagged sections.
2. Make `lib/ai/appleBudgetChat.ts` the canonical finance tool schema and reuse that contract across runtimes.
3. Prototype `Qwen2.5-1.5B-Instruct` against the current `LFM2.5-1.2B` setup on app-specific questions.
4. Add a private eval set for budget coaching, savings questions, timeframe disambiguation, and categorization edge cases.
5. Keep the current categorizer architecture, but return more explicit structured results for medium-confidence flows.

## Related code

- `app/(tabs)/insights.tsx`
- `context/RAGContext.tsx`
- `lib/ai/appleBudgetChat.ts`
- `lib/ai/insightsIntentRouter.ts`
- `lib/ai/categorizer.ts`
- `docs/INSIGHTS_APPLE_BUDGET_COACH.md`
