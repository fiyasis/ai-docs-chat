<div align="center">

# AI Docs Chat

**Chat with your documents.** A fast, dependency-light RAG-lite Q&A app.

[![Made by Fiyasis](https://img.shields.io/badge/Made%20by-Fiyasis-0A66C2?style=flat-square)](https://www.fiyasis.com)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)

</div>

## What it does

Upload or paste documents, then ask questions. The app retrieves the most
relevant passages and answers **with citations**.

- **Works offline** — retrieval uses a built-in **TF-IDF + cosine similarity**
  engine, no API key or server required.
- **Optional LLM** — plug in an OpenAI-compatible key for higher-quality,
  grounded answers. The key stays in your browser.
- **Zero backend** — 100% client-side, deployable to any static host.

## How it works

```
Documents → chunk → TF-IDF index → cosine search → top-k passages → answer
                                                                    ├─ offline: extractive
                                                                    └─ LLM: grounded prompt
```

## Getting started

```bash
npm install
npm run dev      # start the app
npm run build    # production build
```

## Project structure

```
src/
  lib/rag.ts   # chunking, TF-IDF index, cosine search, extractive answer
  lib/llm.ts   # optional OpenAI-compatible chat completion
  App.tsx      # UI
```

## Roadmap

- [ ] PDF and DOCX parsing
- [ ] Persistent IndexedDB storage
- [ ] Streaming LLM responses
- [ ] Multi-document collections

## License

MIT © Fiyasis
