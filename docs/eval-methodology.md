# Metodologi Evaluasi Deterministik (E01–E10)

Unit test konvensional hanya menguji apakah fungsi $f(x)$ menghasilkan $y$. Namun, sistem AI agen bersifat non-deterministik dan rentan gagal di perbatasan runtime (*runtime boundaries*).

Suite evaluasi **E01–E10** dirancang untuk menguji kehandalan sistem agen saat menghadapi anomali tanpa memerlukan koneksi internet atau saldo API luar (*zero-key deterministic execution*).

---

## Rincian 10 Skenario Evaluasi

### `E01`: Correct Tool Selection (Happy Path)
* **Tujuan:** Memvalidasi bahwa saat model memilih tool terdaftar dengan argumen valid, eksekusi berjalan tepat satu kali, output tervalidasi, dan agen mengakhiri siklus di state `TERMINATED`.

### `E02`: Invalid Tool Arguments Rejection
* **Tujuan:** Memvalidasi bahwa argumen yang tidak sesuai kontrak Zod langsung dibatalkan sebelum menyentuh fungsi eksekusi tool, mencegah kerusakan sistem hilir.

### `E03`: Tool Timeout & Bounded Recovery
* **Tujuan:** Memvalidasi bahwa tool yang mengalami latensi berlebih diputus tepat waktu oleh `AbortController`, dan sistem melakukan percobaan ulang (*retry*) yang berhasil pada percobaan kedua.

### `E04`: Malformed Model Decision Rejection
* **Tujuan:** Menguji reaksi harness saat model LLM mengembalikan JSON acak/rusak yang tidak memiliki format discriminated union `tool_call` atau `final`.

### `E05`: Duplicate Tool Invocation Guard
* **Tujuan:** Mencegah pemborosan biaya API saat model terjebak dalam perulangan memanggil tool dan argumen yang sama berulang kali. Dibatasi pada threshold (default 2x).

### `E06`: Context Window Pressure & Pruning
* **Tujuan:** Menguji algoritma pemangkasan memori saat riwayat percakapan melampaui kuota token: instruksi sistem `CRITICAL` wajib dipertahankan, sedangkan jejak `DISCARDABLE` dipangkas lebih dulu.

### `E07`: Upstream Model Failure Boundary
* **Tujuan:** Memastikan bahwa kegagalan mendadak dari penyedia model (HTTP 503 / disconnect) segera mengubah state agen menjadi `ERROR` tanpa membiarkan proses menggantung (*hanging process*).

### `E08`: Infinite Loop Termination Guard
* **Tujuan:** Menjamin agen yang terus-menerus memanggil tool baru tanpa pernah memberikan jawaban final akan diputus paksa tepat saat mencapai batas langkah maksimal (`maxSteps`).

### `E09`: Partial Tool Failure Semantics
* **Tujuan:** Dalam alur multi-operasi di mana Tool A berhasil dan Tool B gagal, hasil Tool A tidak hilang dari memori konteks, dan kegagalan dilaporkan secara jujur.

### `E10`: End-to-End Resilience & Recovery Showcase
* **Tujuan:** Ujian ketahanan lengkap: Tool pertama timeout $\rightarrow$ retry berhasil $\rightarrow$ model mengamati hasil $\rightarrow$ jawaban final tercapai dengan jejak audit yang kronologis dan valid.
