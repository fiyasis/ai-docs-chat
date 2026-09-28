export interface Chunk {
  id: number;
  text: string;
  source: string;
}

export interface SearchResult extends Chunk {
  score: number;
}

export interface SearchIndex {
  chunks: Chunk[];
  vectors: number[][];
  idf: Map<string, number>;
  vocab: Map<string, number>;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "of", "to", "in",
  "on", "for", "with", "as", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "at", "by", "from", "into",
  "about", "we", "you", "i", "he", "she", "they", "them", "his", "her", "our",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

export function chunkText(
  text: string,
  source: string,
  chunkSize = 480,
  overlap = 80
): Chunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: Chunk[] = [];
  let start = 0;
  let id = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push({ id: id++, text: clean.slice(start, end).trim(), source });
    if (end === clean.length) break;
    start = end - overlap;
  }
  return chunks.filter((c) => c.text.length > 0);
}

export function buildIndex(chunks: Chunk[]): SearchIndex {
  const df = new Map<string, number>();
  const tokenized = chunks.map((c) => {
    const tokens = tokenize(c.text);
    const unique = new Set(tokens);
    unique.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
    return tokens;
  });

  const idf = new Map<string, number>();
  df.forEach((count, term) => {
    idf.set(term, Math.log((chunks.length + 1) / (count + 1)) + 1);
  });

  const vocab = new Map<string, number>();
  idf.forEach((_, term) => vocab.set(term, vocab.size));

  const vectors = tokenized.map((tokens) => {
    const vec = new Array(vocab.size).fill(0);
    const tf = new Map<string, number>();
    tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    tf.forEach((count, term) => {
      const idx = vocab.get(term)!;
      vec[idx] = (count / tokens.length) * (idf.get(term) ?? 1);
    });
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  });

  return { chunks, vectors, idf, vocab };
}

function queryVector(query: string, index: SearchIndex): number[] {
  const vec = new Array(index.vocab.size).fill(0);
  const tokens = tokenize(query);
  const tf = new Map<string, number>();
  tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
  tf.forEach((count, term) => {
    const idx = index.vocab.get(term);
    if (idx === undefined) return;
    vec[idx] = (count / tokens.length) * (index.idf.get(term) ?? 1);
  });
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function search(query: string, index: SearchIndex, topK = 4): SearchResult[] {
  const qv = queryVector(query, index);
  return index.chunks
    .map((chunk, i) => ({ ...chunk, score: cosine(qv, index.vectors[i]) }))
    .filter((r) => r.score > 0.01)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function extractiveAnswer(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return "I couldn't find anything relevant in the provided documents.";
  }
  const queryTerms = new Set(tokenize(query));
  const sentences: { text: string; score: number }[] = [];

  results.forEach((result, rank) => {
    result.text
      .split(/(?<=[.!?])\s+/)
      .forEach((sentence) => {
        const terms = tokenize(sentence);
        if (terms.length < 3) return;
        const overlap = terms.filter((t) => queryTerms.has(t)).length;
        const score = overlap / Math.sqrt(terms.length) + 1 / (rank + 1);
        if (overlap > 0) sentences.push({ text: sentence.trim(), score });
      });
  });

  sentences.sort((a, b) => b.score - a.score);
  const top = sentences.slice(0, 3).map((s) => s.text);
  return top.length
    ? top.join(" ")
    : results[0].text.slice(0, 400).trim() + "…";
}
