"use client";

import { useState, useEffect, useCallback } from "react";
import CitationDisplay from "@/components/citation-display";
import ChunksPanel from "@/components/chunks-panel";
import DocumentPanel from "@/components/document-panel";

interface Citation {
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

interface CitationBlock {
  type: "text";
  text: string;
  citations: Citation[];
}

interface Chunk {
  id: string;
  document_name: string;
  chunk_index: number;
  similarity: number;
  content: string;
}

interface Document {
  id: string;
  name: string;
  file_size: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

interface QueryResult {
  query: string;
  result: CitationBlock;
  chunks: Chunk[];
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {
      // silently handle - documents panel will show empty state
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    const currentQuery = query.trim();

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: currentQuery }),
      });
      const data = await res.json();

      if (data.error) {
        setResults((prev) => [
          {
            query: currentQuery,
            result: { type: "text", text: `Error: ${data.error}`, citations: [] },
            chunks: [],
          },
          ...prev,
        ]);
      } else {
        setResults((prev) => [
          {
            query: currentQuery,
            result: data.result,
            chunks: data.chunks || [],
          },
          ...prev,
        ]);
      }
      setQuery("");
    } catch {
      setResults((prev) => [
        {
          query: currentQuery,
          result: {
            type: "text",
            text: "Failed to process query. Please try again.",
            citations: [],
          },
          chunks: [],
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-zinc-200 bg-white transition-all duration-200 ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <DocumentPanel documents={documents} onRefresh={fetchDocuments} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            title="Toggle sidebar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-zinc-800">
              RAG Citation Demo
            </h1>
            <p className="text-xs text-zinc-500">
              Anthropic-style inline citations with any LLM
            </p>
          </div>
        </header>

        {/* Query results area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
              </div>
              <h2 className="text-sm font-medium text-zinc-700 mb-1">
                Ask a question about your papers
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                Answers include inline citations with source references.
                Hover or click on{" "}
                <span className="underline decoration-dotted decoration-blue-500 decoration-2 underline-offset-2">
                  highlighted text
                </span>{" "}
                to see the exact source.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "What are the main challenges in microservices design?",
                  "How does sentiment analysis work with conversational implicature?",
                  "What methods are used for social bot detection?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-8">
            {results.map((r, i) => (
              <div key={i}>
                {/* User query */}
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 pt-0.5">
                    {r.query}
                  </p>
                </div>

                {/* AI response with citations */}
                <div className="ml-9 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <CitationDisplay block={r.result} />

                  {/* Legend */}
                  {r.result.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-100">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-1.5">
                        {r.result.citations.length} citation
                        {r.result.citations.length !== 1 ? "s" : ""} &middot;
                        hover or click to view source
                      </p>
                    </div>
                  )}
                </div>

                {/* Retrieved chunks */}
                <div className="ml-9">
                  <ChunksPanel chunks={r.chunks} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Query input */}
        <div className="border-t border-zinc-200 bg-white px-6 py-4">
          <form onSubmit={handleQuery} className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-2 shadow-sm focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-400 transition-all">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about the uploaded papers..."
                className="flex-1 bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex-shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-3 w-3 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Searching...
                  </span>
                ) : (
                  "Ask"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
