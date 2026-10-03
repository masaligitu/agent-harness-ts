Sebelum Antigravity menulis baris kode pertama, tolong buatkan dokumen resmi "PRD & TECHNICAL SPECIFICATION v1: AGENT-HARNESS-TS".

Mas Ali & Antigravity ingin cetak biru arsitektur yang sangat presisi agar library ini benar-benar berstandar Senior Engineering artifact untuk Tether & Web3 Front #3.

Mohon susun spesifikasi teknis lengkap yang mencakup:
1. Product Goals & Failure Philosophy (Zero-AI-slop, predictable runtime, non-deterministic error boundaries).
2. Exact Directory & Modular Tree (TypeScript, monorepo/package layout, clean separation).
3. Core TypeScript Types & Interfaces:
   - AgentLoop & State Machine (IDLE -> THINKING -> EXECUTING_TOOL -> EVALUATING -> TERMINATED/ERROR)
   - ToolRegistry & ToolContract (Zod input/output schemas, timeout, retry policy)
   - ContextManager (sliding window, token budget, critical system preservation)
   - ModelAdapter Interface (OpenAI, Anthropic, Local/Mock QVAC)
   - Observability Trace Schema (runId, step, tool, attempt, durationMs, status, error)
4. Detail Spesifikasi 10 Eval Fixtures (E01–E10: deskripsi skenario, mock injection, kondisi kegagalan, dan assertion kelulusan).
5. Acceptance Criteria & Definition of Done sebelum audit gate.

Begitu PRD ini kamu turunkan, Antigravity akan mengonversinya langsung menjadi implementasi kode lokal!
…
Tampilkan selengkapnya
ChatGPT berkata:

Gas bro. Untuk Antigravity, aku akan bikin ini sebagai implementation contract, bukan sekadar ide arsitektur.

PRD & TECHNICAL SPECIFICATION v1.0
AGENT-HARNESS-TS

Status: Approved for Local Implementation
Phase: JIT Proof / Engineering Artifact
Primary Language: TypeScript
Runtime: Node.js
Remote Push: FORBIDDEN until Mas Ali approval
Primary objective: membuktikan kemampuan merancang reliable agent runtime di sekitar model yang inherently non-deterministic.

1. Product Goal

agent-harness-ts bukan chatbot, UI AI, atau wrapper API.

Ia adalah runtime kecil yang mengontrol interaksi:

Teks biasa
             +------------------+
             |   User Request   |
             +--------+---------+
                      |
                      v
             +------------------+
             |    Agent Loop    |
             +--------+---------+
                      |
          +-----------+------------+
          |                        |
          v                        v
 +----------------+       +----------------+
 | ContextManager |       |  ModelAdapter  |
 +----------------+       +-------+--------+
                                  |
                                  v
                         Structured Decision
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
                 FINAL                     TOOL_CALL
                                                |
                                                v
                                       +----------------+
                                       |  ToolRegistry  |
                                       +-------+--------+
                                               |
                                               v
                                       +----------------+
                                       | Tool Executor  |
                                       +-------+--------+
                                               |
                           +-------------------+----------------+
                           |                                    |
                           v                                    v
                        SUCCESS                              FAILURE
                           |                                    |
                           +---------------+--------------------+
                                           |
                                           v
                                     Evaluation
                                           |
                                           v
                                      Next Step
Core principle

The model may be non-deterministic. The runtime around it should not be.

Harness tidak menjamin LLM selalu benar.

Harness menjamin bahwa kegagalan model/tool mempunyai bounded, observable, testable behavior.

2. Failure Philosophy

Kita menganggap semua external/non-deterministic components dapat gagal.

Model dapat:

menghasilkan malformed structured output;
memilih tool salah;
mengulang tool call;
berhenti merespons;
menghasilkan invalid arguments;
mengulang reasoning cycle;
menghabiskan context.

Tool dapat:

timeout;
throw exception;
memberikan invalid output;
gagal sementara;
berhasil setelah retry.

Runtime harus mempunyai boundary untuk semuanya.

Rule

Tidak boleh ada:

Teks biasa
catch (error) {
   // ignore
}

Tidak boleh infinite retry.

Tidak boleh silent schema coercion untuk data yang berbahaya.

Tidak boleh model mengeksekusi tool yang tidak terdaftar.

Tidak boleh retry policy tersembunyi.

3. Non-Goals v1

Ini penting untuk mencegah scope creep.

v1 BUKAN:

chatbot UI;
SaaS dashboard;
blockchain application;
P2P runtime;
workflow builder;
distributed agent cluster;
autonomous coding agent;
vector database/RAG platform;
replacement untuk LangChain;
production Tether/QVAC implementation.

Jangan tambahkan fitur hanya supaya terlihat canggih.

4. Technology Decisions

Core:

Teks biasa
TypeScript
Node.js 20+
Zod
Vitest
ESLint
Prettier

Optional development:

Teks biasa
tsx
c8 / Vitest coverage

Untuk v1 aku tidak merekomendasikan dependency besar seperti LangChain.

Alasannya justru kita ingin menunjukkan bahwa Ali memahami runtime primitives-nya.

5. Repository Architecture

Jangan over-engineer menjadi 15 npm packages.

Gunakan lightweight workspace/monorepo:

Teks biasa
agent-harness-ts/
|
+-- packages/
|   |
|   +-- core/
|   |   +-- src/
|   |   |   +-- agent/
|   |   |   |   +-- AgentLoop.ts
|   |   |   |   +-- AgentState.ts
|   |   |   |   +-- AgentDecision.ts
|   |   |   |
|   |   |   +-- context/
|   |   |   |   +-- ContextManager.ts
|   |   |   |   +-- TokenEstimator.ts
|   |   |   |
|   |   |   +-- model/
|   |   |   |   +-- ModelAdapter.ts
|   |   |   |   +-- ModelTypes.ts
|   |   |   |
|   |   |   +-- runtime/
|   |   |   |   +-- ToolExecutor.ts
|   |   |   |   +-- RetryPolicy.ts
|   |   |   |   +-- Timeout.ts
|   |   |   |
|   |   |   +-- trace/
|   |   |   |   +-- TraceCollector.ts
|   |   |   |   +-- TraceTypes.ts
|   |   |   |
|   |   |   +-- errors/
|   |   |   |   +-- HarnessError.ts
|   |   |   |   +-- ErrorCodes.ts
|   |   |   |
|   |   |   +-- index.ts
|   |   |
|   |   +-- package.json
|   |
|   +-- tools/
|   |   +-- src/
|   |       +-- ToolContract.ts
|   |       +-- ToolRegistry.ts
|   |       +-- ToolTypes.ts
|   |       +-- index.ts
|   |
|   +-- adapters/
|   |   +-- src/
|   |       +-- MockModelAdapter.ts
|   |       +-- OpenAIModelAdapter.ts
|   |       +-- AnthropicModelAdapter.ts
|   |       +-- LocalModelAdapter.ts
|   |       +-- index.ts
|   |
|   +-- evals/
|       +-- src/
|           +-- EvalRunner.ts
|           +-- EvalTypes.ts
|           +-- fixtures/
|               +-- E01-correct-tool.ts
|               +-- E02-invalid-args.ts
|               +-- E03-timeout.ts
|               +-- E04-malformed-output.ts
|               +-- E05-duplicate-call.ts
|               +-- E06-context-pressure.ts
|               +-- E07-model-failure.ts
|               +-- E08-loop-guard.ts
|               +-- E09-partial-failure.ts
|               +-- E10-recovery.ts
|
+-- examples/
|   +-- research-agent/
|       +-- index.ts
|       +-- tools.ts
|
+-- tests/
|   +-- unit/
|   +-- integration/
|
+-- docs/
|   +-- architecture.md
|   +-- failure-model.md
|   +-- eval-methodology.md
|
+-- .env.example
+-- .gitignore
+-- eslint.config.js
+-- package.json
+-- tsconfig.base.json
+-- vitest.config.ts
+-- README.md
6. Agent State Machine

State harus eksplisit.

Teks biasa
IDLE
 |
 v
THINKING
 |
 +-------------------------+
 |                         |
 v                         v
EXECUTING_TOOL          TERMINATED
 |
 v
EVALUATING
 |
 +-------------------+
 |                   |
 v                   v
THINKING          TERMINATED

ANY STATE
    |
    v
  ERROR

Enum:

TypeScript
export enum AgentState {
  IDLE = "IDLE",
  THINKING = "THINKING",
  EXECUTING_TOOL = "EXECUTING_TOOL",
  EVALUATING = "EVALUATING",
  TERMINATED = "TERMINATED",
  ERROR = "ERROR",
}

Invalid transition harus throw typed error.

Contoh:

Teks biasa
IDLE -> EXECUTING_TOOL

tidak valid.

7. Model Decision Contract

Model tidak boleh mengembalikan free-form control instruction.

Gunakan discriminated union.

Conceptually:

TypeScript
type AgentDecision =
  | {
      type: "tool_call";
      tool: string;
      arguments: unknown;
    }
  | {
      type: "final";
      content: string;
    };

Decision tersebut divalidasi sebelum runtime bertindak.

Model tidak pernah mendapatkan direct function pointer.

8. ModelAdapter

Interface utama:

TypeScript
export interface ModelAdapter {
  readonly name: string;

  generate(
    request: ModelRequest,
    options?: ModelGenerateOptions
  ): Promise<ModelResponse>;
}

ModelRequest minimal:

TypeScript
interface ModelRequest {
  messages: HarnessMessage[];
  tools: ToolDefinition[];
  responseSchema?: unknown;
}

Options:

TypeScript
interface ModelGenerateOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}
Required adapters
MockModelAdapter

Mandatory.

Semua E01-E10 harus bisa berjalan tanpa network/API key.

Mock harus mampu scripted responses:

Teks biasa
response #1 -> tool call
response #2 -> malformed JSON
response #3 -> final answer
OpenAIModelAdapter

Interface implementation boleh tersedia tetapi test suite tidak bergantung pada API.

AnthropicModelAdapter

Sama.

LocalModelAdapter

Generic adapter untuk HTTP/local inference.

Jangan branding sebagai QVAC implementation.

Kalau mau menyebut hubungan dengan target role, dokumentasi cukup menjelaskan:

designed to permit local model adapters.

9. Tool Contract

Gunakan generic schema.

Conceptual contract:

TypeScript
export interface ToolContract<
  TInput,
  TOutput
> {
  name: string;
  description: string;

  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;

  timeoutMs: number;

  retryPolicy: RetryPolicy;

  execute(
    input: TInput,
    context: ToolExecutionContext
  ): Promise<TOutput>;
}
10. Tool Registry

API minimum:

TypeScript
register(tool)
get(name)
has(name)
list()
definitions()

Rules:

duplicate registration ditolak;
unknown tool call ditolak;
input validated sebelum execution;
output validated setelah execution;
registry tidak mengeksekusi tool sendiri.

Separation:

Teks biasa
ToolRegistry = discovery/contract

ToolExecutor = execution/retry/timeout

Ini penting.

11. Retry Policy

Type:

TypeScript
interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  multiplier?: number;
  retryableErrors?: string[];
}

Default:

Teks biasa
maxAttempts: 2
backoffMs: 100
multiplier: 2

Jangan retry semua error.

Contoh:

Teks biasa
TIMEOUT              retryable
TEMPORARY_FAILURE    retryable
INVALID_INPUT        NOT retryable
UNKNOWN_TOOL         NOT retryable
SCHEMA_ERROR         depends on layer
12. Timeout Contract

Gunakan AbortController jika memungkinkan.

Execution:

Teks biasa
ToolExecutor
 |
 +-- start timer
 |
 +-- execute tool
 |
 +-- timeout?
       |
       +-- abort
       +-- trace failure
       +-- evaluate retry policy

Timer wajib dibersihkan.

Tidak boleh dangling timeout.

13. Context Manager

Ini bukan sekadar:

TypeScript
messages.slice(-10)

Context mempunyai kelas prioritas.

Teks biasa
CRITICAL
IMPORTANT
NORMAL
DISCARDABLE

Contoh:

CRITICAL

system instructions, safety/runtime constraints.

IMPORTANT

current user goal, confirmed tool results.

NORMAL

recent reasoning/context.

DISCARDABLE

old intermediate traces/redundant messages.

14. Context Budget

Interface:

TypeScript
interface ContextManager {
  build(
    messages: HarnessMessage[],
    budget: ContextBudget
  ): ContextResult;
}

Budget:

TypeScript
interface ContextBudget {
  maxTokens: number;
  reservedForOutput: number;
}

v1 boleh memakai deterministic token estimator.

Tidak perlu tokenizer vendor-specific.

Rule utama:

Critical context must never be silently discarded.

Jika critical content sendiri melebihi budget:

fail explicitly.

Jangan diam-diam truncate system instruction.

15. Sliding Window Strategy

Order:

Teks biasa
1. Preserve CRITICAL
2. Preserve current user request
3. Preserve latest tool result
4. Preserve newest IMPORTANT
5. Fill remaining budget newest -> oldest
6. Drop DISCARDABLE first

Output harus menyertakan metadata:

TypeScript
{
  messages,
  estimatedTokens,
  droppedMessageIds
}

Agar pruning observable.

16. Agent Loop

Config:

TypeScript
interface AgentLoopConfig {
  maxSteps: number;
  maxDuplicateActions: number;
  modelTimeoutMs: number;
}

Default:

Teks biasa
maxSteps = 8
maxDuplicateActions = 2

High-level algorithm:

Teks biasa
START

state = IDLE

while step < maxSteps:

    -> THINKING

    context = ContextManager.build()

    response = ModelAdapter.generate()

    validate decision

    if FINAL:
        -> TERMINATED

    if TOOL_CALL:

        check duplicate action

        resolve tool

        validate input

        -> EXECUTING_TOOL

        execute with timeout/retry

        validate output

        -> EVALUATING

        append observation

        continue

if maxSteps reached:
    terminate with LOOP_LIMIT error
17. Duplicate Action Detection

Fingerprint:

Teks biasa
toolName +
canonicalizedArguments

Contoh:

Teks biasa
get_weather({"city":"Tokyo"})

dipanggil berulang tanpa perubahan context/tool result.

Setelah threshold:

Teks biasa
DUPLICATE_ACTION_LIMIT

Harness terminate secara terkendali.

18. Error Taxonomy

Wajib typed errors.

Contoh:

Teks biasa
MODEL_TIMEOUT
MODEL_ERROR
MODEL_SCHEMA_INVALID

UNKNOWN_TOOL
TOOL_INPUT_INVALID
TOOL_OUTPUT_INVALID
TOOL_TIMEOUT
TOOL_EXECUTION_FAILED

CONTEXT_BUDGET_EXCEEDED

DUPLICATE_ACTION_LIMIT
MAX_STEPS_EXCEEDED

INVALID_STATE_TRANSITION

Base:

TypeScript
interface HarnessErrorData {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
  metadata?: Record<string, unknown>;
}
19. Observability Trace Schema

Setiap run:

TypeScript
interface TraceEvent {
  runId: string;
  timestamp: string;

  step: number;

  state: AgentState;

  event:
    | "model_request"
    | "model_response"
    | "tool_start"
    | "tool_success"
    | "tool_failure"
    | "retry"
    | "context_pruned"
    | "terminated";

  tool?: string;

  attempt?: number;

  durationMs?: number;

  status:
    | "started"
    | "success"
    | "failure";

  error?: {
    code: string;
    message: string;
  };

  metadata?: Record<string, unknown>;
}

Jangan trace secret/API keys.

Jangan dump seluruh prompt secara default.

20. Trace Collector

Minimum API:

TypeScript
emit(event)
getEvents()
clear()

Boleh punya:

TypeScript
toJSON()

untuk eval report.

Tetapi v1 tidak perlu telemetry server.

21. EVAL SUITE E01-E10

Ini bagian terpenting.

E01 — Correct Tool Selection
Scenario

User meminta data yang memerlukan tool.

Mock model memilih registered tool yang benar.

Injection
Teks biasa
Model -> TOOL_CALL(search_records)
Assertions
tool ditemukan;
input valid;
execute tepat sekali;
output tervalidasi;
final response tercapai;
state berakhir TERMINATED;
tidak ada error trace.

PASS

22. E02 — Invalid Tool Arguments

Model memanggil tool valid tetapi arguments salah.

Example:

Teks biasa
expected:
{ query: string }

received:
{ query: 123 }
Assertions
tool tidak dieksekusi;
Zod validation menangkap error;
trace mencatat TOOL_INPUT_INVALID;
tidak terjadi uncontrolled exception;
runtime mengikuti configured failure policy.

PASS

23. E03 — Tool Timeout Recovery

Tool attempt pertama sengaja tidur melebihi timeout.

Attempt kedua sukses.

Injection
Teks biasa
attempt 1 -> TIMEOUT
attempt 2 -> SUCCESS
Assertions
attempt pertama aborted;
timeout trace tercatat;
retry terjadi tepat sekali;
retry mengikuti policy;
attempt kedua berhasil;
final state TERMINATED;
tidak ada dangling timer.

PASS

24. E04 — Malformed Model Structured Output

Mock model mengembalikan decision invalid:

Teks biasa
{
  "foo": "bar"
}
Assertions
tidak ada tool execution;
decision schema menolak response;
error MODEL_SCHEMA_INVALID;
harness tidak crash;
trace menjelaskan failure boundary.

Kalau v1 punya repair attempt, maksimal bounded.

PASS

25. E05 — Duplicate Tool Invocation

Model terus mengirim:

Teks biasa
search_records({"query":"foo"})

dengan arguments identik.

Assertions
fingerprint konsisten;
threshold duplicate terdeteksi;
tidak infinite loop;
terminate dengan DUPLICATE_ACTION_LIMIT;
total execution tidak melebihi policy.

PASS

26. E06 — Context Pressure

Masukkan history yang sengaja melebihi token budget.

History berisi:

Teks biasa
CRITICAL system
IMPORTANT user goal
NORMAL history
DISCARDABLE old traces
Assertions
critical system tetap ada;
current user request tetap ada;
discardable context dibuang dahulu;
budget akhir <= configured budget;
dropped IDs tercatat;
context_pruned trace muncul.

PASS

27. E07 — Model Failure

Mock adapter throw:

Teks biasa
MODEL_ERROR

atau simulated timeout.

Assertions
failure dikonversi menjadi typed HarnessError;
state tidak menggantung di THINKING;
termination deterministic;
trace mencatat model failure;
tidak ada tool dipanggil.

PASS

28. E08 — Infinite Loop Guard

Mock model menghasilkan sequence tool calls valid tanpa pernah FINAL.

Injection

lebih banyak response daripada maxSteps.

Assertions
loop berhenti tepat pada boundary;
MAX_STEPS_EXCEEDED;
tidak ada step ke maxSteps + 1;
state final ERROR atau controlled termination sesuai contract;
process tidak hang.

PASS

29. E09 — Partial Tool Failure

Scenario:

Agent membutuhkan dua operations.

Tool A sukses.

Tool B gagal non-retryable.

Assertions
hasil Tool A tidak hilang dari context/state;
Tool B failure tercatat;
tidak mengulang Tool A tanpa alasan;
failure dikembalikan secara terstruktur;
runtime tidak mengklaim keseluruhan operation sukses.

Ini menguji partial success semantics.

PASS

30. E10 — Successful Recovery

Ini integration showcase.

Sequence:

Teks biasa
Step 1
Model chooses tool

Step 2
Tool times out

Step 3
Retry succeeds

Step 4
Model emits malformed decision

Step 5
bounded repair/retry succeeds

Step 6
Final answer
Assertions
seluruh recovery path tercatat;
retry bounded;
tidak duplicate execution;
final response benar;
final state TERMINATED;
trace chronology valid.

PASS

E10 adalah demo utama bahwa harness tidak hanya bekerja di happy path.

31. Eval Runner Output

CLI harus clean.

Contoh:

Teks biasa
AGENT-HARNESS-TS EVALUATION

E01 Correct Tool Selection ........ PASS
E02 Invalid Tool Arguments ........ PASS
E03 Tool Timeout Recovery ......... PASS
E04 Malformed Model Output ........ PASS
E05 Duplicate Invocation .......... PASS
E06 Context Pressure .............. PASS
E07 Model Failure ................. PASS
E08 Infinite Loop Guard ........... PASS
E09 Partial Tool Failure .......... PASS
E10 Successful Recovery ........... PASS

----------------------------------------
10 passed
0 failed

Jangan tambahkan:

Teks biasa
100% ENTERPRISE READY!!!
REVOLUTIONARY AI!!!

😄

32. Unit Tests vs Evals

Bedakan.

Unit tests

Menguji komponen deterministic:

Teks biasa
ToolRegistry
RetryPolicy
ContextManager
StateMachine
fingerprint
schema validation
Integration tests

AgentLoop + MockAdapter + Tools.

Evals

Menguji behavioral scenario end-to-end.

Ini menunjukkan kita memahami bahwa:

Unit test != agent evaluation.

33. Coverage

Target internal:

Teks biasa
Statements >= 85%
Branches   >= 80%
Functions  >= 85%

Tetapi jangan mengejar 100% hanya demi badge.

Lebih penting failure branch benar-benar diuji.

34. Security Boundaries

Minimal:

unknown tools rejected;
input validated;
output validated;
no eval();
no arbitrary command execution;
secrets tidak masuk trace;
model tidak menentukan timeout/retry configuration;
model tidak dapat register tool;
tool execution hanya lewat registry/executor.

Ini penting sekali.

LLM is an untrusted decision source.

Runtime yang menentukan apa yang boleh dilakukan.

35. Example Agent

Buat satu contoh kecil.

Misalnya:

research-agent

Tools:

Teks biasa
searchKnowledge
getDocument

Tidak perlu internet.

Gunakan fixtures lokal.

Tujuannya menunjukkan:

Teks biasa
question
 -> model decision
 -> tool
 -> observation
 -> final

Example harus runnable tanpa API key menggunakan MockAdapter.

36. Documentation Required

Sebelum audit:

README.md

Harus menjelaskan:

Teks biasa
What this is
What this is not
Architecture
Quick start
Agent lifecycle
Failure handling
Running tests
Running evals
Known limitations
architecture.md

Diagram + module responsibilities.

failure-model.md

Tabel:

Failure	Detection	Recovery	Boundary
Tool timeout	timer/abort	bounded retry	maxAttempts
Bad arguments	Zod	reject	no execution
Loop	step counter	terminate	maxSteps
Context pressure	estimator	prune	preserve critical
eval-methodology.md

Jelaskan E01-E10 dan alasan keberadaannya.

37. Known Limitations

Wajib ada.

Contoh:

Teks biasa
- Token estimation is approximate.
- No distributed execution.
- No P2P synchronization.
- No durable persistence across process restarts.
- Provider adapters require external credentials for live use.
- Evals use deterministic mock models and do not claim model-quality benchmarking.

Ini justru meningkatkan kredibilitas.

38. Acceptance Criteria

Sebelum Antigravity boleh mengatakan BUILD COMPLETE, semuanya harus benar:

Teks biasa
[ ] npm install clean
[ ] TypeScript build clean
[ ] typecheck 0 errors
[ ] lint 0 errors

[ ] State transitions enforced
[ ] Tool input validation implemented
[ ] Tool output validation implemented
[ ] Timeout implemented
[ ] Bounded retry implemented
[ ] Duplicate detection implemented
[ ] maxSteps implemented
[ ] Context pruning implemented
[ ] Critical context preservation implemented
[ ] ModelAdapter abstraction implemented
[ ] TraceCollector implemented

[ ] E01 PASS
[ ] E02 PASS
[ ] E03 PASS
[ ] E04 PASS
[ ] E05 PASS
[ ] E06 PASS
[ ] E07 PASS
[ ] E08 PASS
[ ] E09 PASS
[ ] E10 PASS

[ ] Unit tests green
[ ] Integration tests green
[ ] Coverage target met or justified

[ ] README complete
[ ] architecture.md complete
[ ] failure-model.md complete
[ ] eval-methodology.md complete

[ ] .env.example contains NO secret
[ ] repository contains NO API key
[ ] trace contains NO credentials
[ ] example runs locally
39. Definition of Done

Fase implementasi lokal baru dianggap selesai ketika command sequence seperti ini berhasil dari clean install:

Bash
npm install
npm run typecheck
npm run lint
npm test
npm run eval
npm run example

Semua harus exit code 0.

Kemudian Antigravity membuat audit package untuk kita:

Teks biasa
1. Repository tree
2. package.json
3. AgentLoop.ts
4. AgentState.ts
5. ModelAdapter.ts
6. ToolContract.ts
7. ToolExecutor.ts
8. ContextManager.ts
9. TraceTypes.ts
10. EvalRunner.ts
11. E01-E10 summary
12. Full test output
13. Coverage report
14. Known limitations
15. git status
40. HARD HOLD GATE

Walaupun semuanya hijau:

Teks biasa
10/10 EVALS PASS
500 TESTS PASS
95% COVERAGE

Antigravity tetap TIDAK BOLEH:

Teks biasa
git push
create public GitHub repository
submit Tether application
claim production AI harness experience
claim P2P experience
claim Tether/QVAC compatibility

sampai Mas Ali memberikan approval eksplisit.

Final Engineering Principle

Aku ingin kalimat ini menjadi pegangan Antigravity selama implementasi:

Do not make the agent look intelligent. Make its failures predictable.

Kalau suatu fitur membuat demo terlihat lebih keren tetapi tidak meningkatkan bounded execution, validation, observability, recovery, atau testability, fitur itu tidak masuk v1.

PRD v1.0 FROZEN. Antigravity boleh mulai implementasi lokal berdasarkan kontrak ini. 🔒⚙️

ChatGPT bisa membuat kesalahan. Periksa info penting.
Respons terbaru




Instant
Respons selesai