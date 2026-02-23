# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint (flat config, core-web-vitals + TypeScript rules)
- `npx tsx scripts/load-papers.ts` — Pre-load PDFs from papers/ into Supabase
- `npx tsx scripts/setup-db.ts` — Check DB connection and create storage bucket

## Tech Stack

- Next.js 16 with App Router (React 19), TypeScript (strict)
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- Supabase (self-hosted on AWS EC2) — PostgreSQL + pgvector + Storage
- Azure OpenAI — gpt-4.1-nano (chat), text-embedding-3-small (embeddings, 1536 dims)
- Path alias: `@/*` maps to project root

## Architecture

### RAG Citation Pipeline (core feature)
The app implements Anthropic-style inline citations following a single-pass approach:
1. User query → embedding via Azure OpenAI text-embedding-3-small
2. Vector similarity search via Supabase `rag_match_chunks` RPC (pgvector cosine)
3. Top chunks + query sent to LLM with citation-aware system prompt
4. LLM returns answer with inline `<CIT chunk_id='N' sentences='X-Y'>` tags
5. Parser extracts citations, maps back to source sentences in chunks
6. Frontend renders dotted-underline cited text with hover/click popovers

### Key Files
- `lib/citations.ts` — Citation pipeline: LLM prompt, response parser, sentence mapping
- `lib/embeddings.ts` — Azure OpenAI embedding generation (batched)
- `lib/pdf.ts` — PDF text extraction (pdf-parse v1) and chunking
- `lib/supabase.ts` — Supabase client (anon + service role)
- `components/citation-display.tsx` — Citation hover/click UI (the hero component)

### API Routes
- `POST /api/query` — RAG query with citation response
- `POST /api/upload` — Upload PDF, extract, chunk, embed, store
- `GET /api/documents` — List indexed documents
- `DELETE /api/documents/[id]` — Remove document and chunks
- `POST /api/setup` — Health check for DB + storage

### Database (rag_ prefixed tables, shared Supabase instance)
- `rag_documents` — Document metadata
- `rag_document_chunks` — Chunks with vector(1536) embeddings
- `rag_match_chunks()` — RPC for cosine similarity search

## Environment

Credentials in `.env.local` (see `master_credentials.env` for reference). Key vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_BASE_URL`, `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_EMBED_API_KEY`, `AZURE_EMBED_ENDPOINT`, `AZURE_EMBED_DEPLOYMENT`

## Deployment

- GitHub: https://github.com/Trigent-Software-Pvt-Ltd (repo name: rag-citation-demo)
- Vercel: `vercel --prod --yes --scope trigent-ark-os`
- DB migration: `psql <connection-string> -f scripts/setup-db.sql`
