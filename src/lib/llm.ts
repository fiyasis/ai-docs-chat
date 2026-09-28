import type { SearchResult } from "./rag";

export interface LlmOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export async function askLlm(
  question: string,
  contexts: SearchResult[],
  { apiKey, model = "gpt-4o-mini", baseUrl = "https://api.openai.com/v1" }: LlmOptions
): Promise<string> {
  const context = contexts
    .map((c, i) => `[${i + 1}] (${c.source}) ${c.text}`)
    .join("\n\n");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer questions using ONLY the provided context. " +
            "If the answer is not in the context, say you don't know. " +
            "Cite sources as [1], [2] where relevant.",
        },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
