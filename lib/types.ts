// Shared types for the RAG Citation Demo

export interface Document {
  id: string;
  name: string;
  file_size: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

export interface Citation {
  chunk_id: number;
  sentences_range: string;
  answer_snippet: string;
  answer_snippet_start: number;
  answer_snippet_end: number;
  chunk_sentences_text: string;
  chunk_sentences_start: number;
  chunk_sentences_end: number;
  document_name: string;
  chunk_index: number;
}

export interface CitationBlock {
  type: "text";
  text: string;
  citations: Citation[];
}

export interface Chunk {
  id: string;
  document_name: string;
  chunk_index: number;
  similarity: number;
  content: string;
}

export interface ChunkSummary {
  id: string;
  document_name: string;
  chunk_index: number;
  similarity: number;
  content?: string;
}

export interface Conversation {
  id: string;
  document_id: string;
  query: string;
  answer: string;
  citations: Citation[];
  chunks_used: ChunkSummary[];
  created_at: string;
}

export interface QueryResult {
  query: string;
  result: CitationBlock;
  chunks: Chunk[];
  conversation_id?: string;
}
