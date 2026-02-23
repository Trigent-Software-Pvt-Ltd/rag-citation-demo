-- Migration: Add conversations table and update RPC for per-document filtering

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

-- RLS for conversations
ALTER TABLE rag_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read rag_conversations" ON rag_conversations;
CREATE POLICY "Public read rag_conversations" ON rag_conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service write rag_conversations" ON rag_conversations;
CREATE POLICY "Service write rag_conversations" ON rag_conversations FOR ALL USING (true) WITH CHECK (true);

-- Update RPC to accept optional document filter
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
