# agent-harness-ts

> A lightweight, deterministic TypeScript runtime harness designed around non-deterministic AI models. Provides strict Zod schema validation, bounded context management, resilient failure recovery, and reproducible offline evaluation suites.

---

## 1. The Core Problem
Modern generative LLMs are inherently non-deterministic. When deployed as autonomous agents in production systems, unconstrained models frequently:
* Emit malformed or partially typed JSON schemas.
* Pass invalid argument types to sensitive backend APIs.
* Get caught in redundant execution loops calling identical tools.
* Hang processes during network latencies or rate limit timeouts.
* Overflow context windows, silently dropping critical security directives.

`agent-harness-ts` acts as the deterministic chassis around the model. **It does not attempt to make the model infallible; it guarantees that every failure mode has an observable, bounded, and testable boundary.**

---

## 2. Architecture Overview

```
                      [User Goal / Task]
                              │
                              ▼
                      ┌───────────────┐
                      │   AgentLoop   │ ◄─── Strict State Machine
                      └───────┬───────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │ContextManager │               │ ModelAdapter  │
      └───────┬───────┘               └───────┬───────┘
              │                               │
              ▼                               ▼
       Bounded Context             Validated AgentDecision
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
               type: "final"                                   type: "tool_call"
                      │                                               │
                      ▼                                               ▼
                 TERMINATED                              Duplicate Action Fingerprint
                                                                      │
                                                                      ▼
                                                              ┌───────────────┐
                                                              │ ToolRegistry  │
                                                              └───────┬───────┘
                                                                      │
                                                                      ▼
                                                              ┌───────────────┐
                                                              │ ToolExecutor  │ ◄── Timeout & Retry
                                                              └───────┬───────┘
                                                                      │
                                                              ┌───────┴───────┐
                                                              ▼               ▼
                                                           SUCCESS         FAILURE
                                                              │               │
                                                              └───────┬───────┘
                                                                      │
                                                                      ▼
                                                                 EVALUATING
```

---

## 3. Key Capabilities

* **Strict Contract Isolation:** Tools define input and output schemas with [Zod](https://zod.dev). Malformed arguments are rejected before tool execution code is touched.
* **Bounded Retries & Abort Timeouts:** Tool operations race against `AbortController` timers, preventing hanging promises. Only configured retryable errors trigger exponential backoff.
* **Prioritized Context Budgeting:** Messages are classified into `CRITICAL`, `IMPORTANT`, `NORMAL`, and `DISCARDABLE`. System security instructions are never silently truncated; non-essential traces are pruned first under budget pressure.
* **Duplicate Loop Guard:** Canonical argument fingerprinting detects identical cyclical tool calls and halts runaway agent processes.
* **100% Offline Evaluation Suite (E01–E10):** All 10 failure scenarios run against deterministic mock adapters without requiring network access or external API credits.

---

## 4. Quickstart

### Installation
```bash
npm install
```

### Running Typecheck
```bash
npm run typecheck
```

### Running Unit & Integration Tests
```bash
npm test
```

### Running Deterministic Evals (E01–E10)
```bash
npm run eval
```

### Running Local Example
```bash
npm run example
```

---

## 5. Usage Example

```typescript
import { z } from 'zod';
import {
  AgentLoop,
  ToolRegistry,
  ToolExecutor,
  ContextManager,
  TraceCollector,
  MockModelAdapter,
  DEFAULT_RETRY_POLICY
} from 'agent-harness-ts';

// 1. Initialize harness components
const tracer = new TraceCollector();
const registry = new ToolRegistry();
const contextManager = new ContextManager();

// 2. Register typed tool
registry.register({
  name: 'lookup_rate',
  description: 'Fetches currency exchange rate',
  inputSchema: z.object({ pair: z.string() }),
  outputSchema: z.object({ rate: z.number() }),
  timeoutMs: 1500,
  retryPolicy: DEFAULT_RETRY_POLICY,
  execute: async ({ pair }) => ({ rate: 1.085 }),
});

const executor = new ToolExecutor(registry, tracer);

// 3. Configure model adapter (Mock, OpenAI, Anthropic, or Local)
const model = new MockModelAdapter([
  {
    type: 'decision',
    decision: {
      type: 'tool_call',
      tool: 'lookup_rate',
      arguments: { pair: 'EUR/USD' },
    },
  },
  {
    type: 'decision',
    decision: {
      type: 'final',
      content: 'Current exchange rate for EUR/USD is 1.085.',
    },
  },
]);

// 4. Run agent
const loop = new AgentLoop(model, registry, executor, contextManager, tracer);
const result = await loop.run('What is the current EUR/USD rate?');

console.log(result.finalAnswer);
```

---

## 6. Deterministic Eval Suite (E01–E10)

| ID | Fixture Name | Injected Failure / Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **E01** | Correct Tool Selection | Valid tool call and arguments | Executes cleanly, terminates with valid final answer |
| **E02** | Invalid Tool Arguments | Model passes mismatched argument types | Intercepted by Zod prior to execution; no crash |
| **E03** | Tool Timeout Recovery | Attempt #1 exceeds `timeoutMs` | Aborted via signal; retry attempt #2 succeeds cleanly |
| **E04** | Malformed Output Rejection | Model outputs unstructured/broken JSON | Caught by decision schema; emits `MODEL_SCHEMA_INVALID` |
| **E05** | Duplicate Invocation Guard | Model repeats identical tool calls | Fingerprint threshold hit; halted via `DUPLICATE_ACTION_LIMIT` |
| **E06** | Context Window Pressure | Message history exceeds token quota | Safely prunes `DISCARDABLE` logs; preserves `CRITICAL` prompt |
| **E07** | Upstream Provider Failure | Model adapter throws connection/5xx error | Transitions to `ERROR` state deterministically without hanging |
| **E08** | Infinite Loop Termination | Model continuously calls tools without finalizing | Halted strictly at configured `maxSteps` boundary |
| **E09** | Partial Tool Failure | Tool A succeeds; Tool B fails non-retryably | Preserves Tool A context; reports partial failure honestly |
| **E10** | End-to-End Recovery | Tool timeout $\rightarrow$ Retry success $\rightarrow$ Final completion | Verified resilience across entire non-happy path sequence |

---

## 7. Known Limitations
* **Token Estimation:** The built-in token estimator uses deterministic heuristics (~4 characters per token). High-precision production deployments may substitute a model-specific tokenizer.
* **Single-Process Scope:** Synchronization is bounded to the local process runtime. Multi-node distributed peer coordination (e.g. DHT/P2P gossip) is intentionally outside the scope of this core runtime.
* **Persistence:** Session memory resides in memory for the lifecycle of the loop execution.

---

## 8. License
MIT © Ali Furqon (`@masaligitu`)
