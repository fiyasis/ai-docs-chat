import { useMemo, useRef, useState } from "react";
import { buildIndex, chunkText, extractiveAnswer, search, type Chunk } from "./lib/rag";
import { askLlm } from "./lib/llm";

const SAMPLE = `Fiyasis is a full-service app and website development company.
We build mobile apps, websites, UI/UX, cloud and AI solutions for businesses.
A typical minimum viable product (MVP) takes 8 to 12 weeks depending on scope.
We support both iOS and Android using native and cross-platform technologies.
Post-launch support and maintenance plans are available on a flexible basis.
We sign NDAs to protect your ideas and intellectual property before discussions.`;

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
}

export default function App() {
  const [documents, setDocuments] = useState<{ name: string; text: string }[]>([
    { name: "sample.txt", text: SAMPLE },
  ]);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [useLlm, setUseLlm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const chunks = useMemo<Chunk[]>(
    () => documents.flatMap((doc) => chunkText(doc.text, doc.name)),
    [documents]
  );
  const index = useMemo(() => buildIndex(chunks), [chunks]);

  function addDocument() {
    if (!draft.trim()) return;
    setDocuments((prev) => [...prev, { name: `doc-${prev.length + 1}.txt`, text: draft }]);
    setDraft("");
  }

  async function onUpload(files: FileList | null) {
    if (!files) return;
    const loaded = await Promise.all(
      Array.from(files).map(async (file) => ({ name: file.name, text: await file.text() }))
    );
    setDocuments((prev) => [...prev, ...loaded]);
  }

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setBusy(true);

    const results = search(q, index);
    let answer: string;
    try {
      answer =
        useLlm && apiKey
          ? await askLlm(q, results, { apiKey })
          : extractiveAnswer(q, results);
    } catch (err) {
      answer = `Error: ${(err as Error).message}`;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: answer,
        sources: [...new Set(results.map((r) => r.source))],
      },
    ]);
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>
          <span style={{ color: "var(--brand)" }}>AI</span> Docs Chat
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Ask questions about your documents. Works offline with local retrieval; add an
          API key for LLM answers.
        </p>
      </header>

      <section style={panelStyle}>
        <h2 style={h2Style}>1. Documents ({documents.length})</h2>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste some text to index…"
          rows={4}
          style={textareaStyle}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button onClick={addDocument} style={primaryBtn}>
            Add text
          </button>
          <button onClick={() => fileRef.current?.click()} style={secondaryBtn}>
            Upload .txt / .md
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv"
            multiple
            hidden
            onChange={(e) => onUpload(e.target.files)}
          />
          <button onClick={() => setDocuments([])} style={ghostBtn}>
            Clear all
          </button>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={h2Style}>2. Optional LLM (better answers)</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} />
          Use OpenAI for answer generation
        </label>
        {useLlm && (
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
        <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 0 }}>
          Key stays in your browser and is never stored.
        </p>
      </section>

      <section style={panelStyle}>
        <h2 style={h2Style}>3. Ask a question</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="e.g. How long does an MVP take?"
            style={inputStyle}
            disabled={documents.length === 0}
          />
          <button onClick={ask} disabled={busy || documents.length === 0} style={primaryBtn}>
            {busy ? "…" : "Ask"}
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: m.role === "user" ? "#eff6ff" : "#f1f5f9",
                borderLeft: `3px solid ${m.role === "user" ? "var(--brand)" : "#94a3b8"}`,
              }}
            >
              <strong style={{ fontSize: 12, color: "var(--muted)" }}>
                {m.role === "user" ? "You" : "Assistant"}
              </strong>
              <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{m.text}</p>
              {m.sources && m.sources.length > 0 && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  Sources: {m.sources.join(", ")}
                </p>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Ask a question to see retrieved answers with sources.
            </p>
          )}
        </div>
      </section>

      <footer style={{ textAlign: "center", marginTop: 32, color: "var(--muted)", fontSize: 13 }}>
        Built by{" "}
        <a href="https://www.fiyasis.com" style={{ color: "var(--brand)" }}>
          Fiyasis
        </a>
      </footer>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 18,
  marginBottom: 16,
};
const h2Style: React.CSSProperties = { margin: "0 0 10px", fontSize: 15 };
const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--border)",
  resize: "vertical",
};
const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
};
const primaryBtn: React.CSSProperties = {
  background: "var(--brand)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
};
const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 16px",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "none",
  padding: "9px 12px",
};
