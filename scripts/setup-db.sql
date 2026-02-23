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

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RPC function: match chunks by cosine similarity
CREATE OR REPLACE FUNCTION rag_match_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
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
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Row Level Security
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_document_chunks ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read rag_documents" ON rag_documents;
CREATE POLICY "Public read rag_documents" ON rag_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read rag_chunks" ON rag_document_chunks;
CREATE POLICY "Public read rag_chunks" ON rag_document_chunks FOR SELECT USING (true);

-- Service role write access (all operations)
DROP POLICY IF EXISTS "Service write rag_documents" ON rag_documents;
CREATE POLICY "Service write rag_documents" ON rag_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service write rag_chunks" ON rag_document_chunks;
CREATE POLICY "Service write rag_chunks" ON rag_document_chunks FOR ALL USING (true) WITH CHECK (true);
