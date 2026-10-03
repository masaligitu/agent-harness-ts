# Arsitektur & Desain Sistem `agent-harness-ts`

## 1. Filosofi Inti
> *"The model may be non-deterministic. The runtime around it should not be."*

LLM dan model generatif secara fundamental bersifat probabilistik. Namun, infrastruktur eksekusi (runtime harness) yang mengelilingi model tersebut wajib bersifat deterministik, terukur, dan memiliki batas kegagalan (*failure boundaries*) yang terisolasi.

---

## 2. Diagram Alur Siklus Hidup Agen (Agent Lifecycle)

```
        User Goal / Task
               │
               ▼
        ┌──────────────┐
        │  AgentLoop   │ ◄─── State Machine (IDLE -> THINKING)
        └──────┬───────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐ ┌──────────────┐
│ContextManager│ │ ModelAdapter │
└──────┬───────┘ └──────┬───────┘
       │                │
       ▼                ▼
   Bounded        AgentDecision (Zod Discriminated Union)
   Context              │
               ┌────────┴────────┐
               ▼                 ▼
          type: "final"     type: "tool_call"
               │                 │
               ▼                 ▼
          TERMINATED       Duplicate Action Fingerprint Check
                                 │
                                 ▼
                           ┌──────────────┐
                           │ ToolRegistry │
                           └──────┬───────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │ ToolExecutor │ ◄── Timeout & Retry Policy
                           └──────┬───────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                      SUCCESS           FAILURE
                         │                 │
                         └────────┬────────┘
                                  │
                                  ▼
                             EVALUATING
                                  │
                                  ▼
                           Next Loop Step
```

---

## 3. Komponen Utama

### A. Core Runtime (`packages/core`)
1. **`AgentLoop`**: Mengorkestrasi iterasi agen. Membatasi langkah (`maxSteps`), memeriksa aksi duplikat (`DUPLICATE_ACTION_LIMIT`), dan memandu transisi state machine.
2. **`StateMachine`**: Enforcing transisi eksplisit: `IDLE` $\rightarrow$ `THINKING` $\rightarrow$ `EXECUTING_TOOL` $\rightarrow$ `EVALUATING` $\rightarrow$ `TERMINATED` / `ERROR`. Transisi ilegal langsung melempar `INVALID_STATE_TRANSITION`.
3. **`ContextManager`**: Mengelola kuota token menggunakan sliding window berbasis kelas prioritas:
   - `CRITICAL`: System prompt & safety constraints (tidak pernah di-prune; jika melebihi kuota, sistem gagal eksplisit).
   - `IMPORTANT`: User goal terkini & hasil tool terkonfirmasi.
   - `NORMAL`: Riwayat percakapan.
   - `DISCARDABLE`: Log perantara & jejak eksekusi lama (dipangkas pertama kali saat tekanan kuota token).
4. **`ToolExecutor`**: Mengisolasi eksekusi tool dari registry. Menerapkan timeout berbasis `AbortController`, validasi Zod ketat pada input dan output, serta kebijakan retry berbatas (*bounded exponential backoff*).
5. **`TraceCollector`**: Menghasilkan jejak audit terstruktur untuk setiap peristiwa (`runId`, `step`, `state`, `event`, `tool`, `durationMs`, `status`, `error`).

### B. Tool Contracts (`packages/tools`)
* Setiap tool wajib mendefinisikan skema input dan output menggunakan **Zod**.
* Registry menolak pendaftaran nama tool duplikat dan menolak eksekusi tool yang tidak terdaftar.

### C. Model Adapters (`packages/adapters`)
* Antarmuka seragam (`ModelAdapter`) mendukung:
  - `MockModelAdapter`: Digunakan untuk pengujian deterministik dan evaluasi offline tanpa biaya API.
  - `OpenAIModelAdapter`: Adapter REST standar untuk OpenAI.
  - `AnthropicModelAdapter`: Adapter REST standar untuk Claude.
  - `LocalModelAdapter`: Adapter REST lokal untuk arsitektur inference mandiri (Ollama / QVAC).
