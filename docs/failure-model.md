# Failure Model & Boundary Matrix

Dokumen ini memetakan setiap kemungkinan titik kegagalan (*failure mode*) pada runtime agen otonom dan bagaimana `agent-harness-ts` mendeteksi serta membatasinya secara deterministik.

---

## Matriks Penanganan Kegagalan

| Mode Kegagalan | Metode Deteksi | Mekanisme Pemulihan | Batas Keamanan (*Boundary*) |
| :--- | :--- | :--- | :--- |
| **Tool Timeout** | `AbortController` timer balapan | Bounded retry dengan backoff | `timeoutMs` & `maxAttempts` (default 2) |
| **Invalid Tool Input** | Zod schema validation | Eksekusi dibatalkan seketika; error dilaporkan ke trace | Input ditolak sebelum menyentuh kode tool |
| **Invalid Tool Output** | Zod schema validation | Error `TOOL_OUTPUT_INVALID` dilempar ke agen | Data cacat tidak pernah masuk ke memori konteks |
| **Tool Tidak Dikenal** | Registry lookup | Melempar `UNKNOWN_TOOL` | Hanya tool terdaftar yang dapat dieksekusi |
| **Model Output Cacat** | Discriminated union validator | Melempar `MODEL_SCHEMA_INVALID` | Output teks bebas/rusak ditolak |
| **Infinite Agent Loop** | Step counter pada `AgentLoop` | Eksekusi dihentikan paksa | Dibatasi ketat pada `maxSteps` (default 8) |
| **Loop Aksi Duplikat** | Canonical fingerprint hashing | Melempar `DUPLICATE_ACTION_LIMIT` | Maksimal 2x aksi identik berturut-turut |
| **Tekanan Kuota Konteks** | Deterministic token estimator | Pemangkasan selektif (DISCARDABLE $\rightarrow$ NORMAL) | Kuota `maxTokens`; CRITICAL pantang dipotong |
| **Upstream Provider Down** | Network error / HTTP 5xx | Dilempar sebagai `HarnessError` terstruktur | State agen berpindah ke `ERROR` tanpa hang |
| **Transisi State Ilegal** | Validasi graf pada `StateMachine` | Melempar `INVALID_STATE_TRANSITION` | Mesin dilarang melompat langsung ke eksekusi |

---

## Prinsip Nol Pembungkaman (*No Silent Failures*)
1. Tidak ada blok `catch (e) {}` yang menelan error tanpa jejak.
2. Setiap error menghasilkan event `failure` pada `TraceCollector`.
3. Kredensial, kunci API, dan token otentikasi disaring secara otomatis (*redacted*) dari metadata jejak audit.
