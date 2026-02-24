-- RAG Citation Demo - Database Setup
-- Uses rag_ prefix to avoid conflicts with existing tables

-- Enable pgvector extension (likely already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  chunk_count INTEGER DEFAULT 0,
  page_texts JSONB DEFAULT NULL,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document chunks with embeddings (1536 dims for text-embedding-3-small)
CREATE TABLE IF NOT EXISTS rag_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations table (per-document chat history)
CREATE TABLE IF NOT EXISTS rag_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  chunks_used JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rag_conversations_doc_idx
  ON rag_conversations (document_id, created_at);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RPC function: match chunks by cosine similarity
-- Accepts optional filter_document_id to scope search to a single document
CREATE OR REPLACE FUNCTION rag_match_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT,
  document_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity,
    d.name AS document_name
  FROM rag_document_chunks dc
  JOIN rag_documents d ON d.id = dc.document_id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Row Level Security
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_conversations ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read rag_documents" ON rag_documents;
CREATE POLICY "Public read rag_documents" ON rag_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read rag_chunks" ON rag_document_chunks;
CREATE POLICY "Public read rag_chunks" ON rag_document_chunks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read rag_conversations" ON rag_conversations;
CREATE POLICY "Public read rag_conversations" ON rag_conversations FOR SELECT USING (true);

-- Service role write access (all operations)
DROP POLICY IF EXISTS "Service write rag_documents" ON rag_documents;
CREATE POLICY "Service write rag_documents" ON rag_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service write rag_chunks" ON rag_document_chunks;
CREATE POLICY "Service write rag_chunks" ON rag_document_chunks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service write rag_conversations" ON rag_conversations;
CREATE POLICY "Service write rag_conversations" ON rag_conversations FOR ALL USING (true) WITH CHECK (true);
