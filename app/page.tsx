"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DocumentSidebar from "@/components/document-sidebar";
import ChatMessage from "@/components/chat-message";
import ChatInput from "@/components/chat-input";
import { NoDocumentSelected, EmptyChat } from "@/components/empty-state";
import type { Document, Conversation, QueryResult, CitationBlock } from "@/lib/types";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [liveResults, setLiveResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {
      // silently handle
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Fetch conversations when document is selected
  const fetchConversations = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/conversations?document_id=${docId}`);
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch {
      setConversations([]);
    }
  }, []);

  function handleSelectDocument(docId: string) {
    if (docId === selectedDocumentId) return;
    setSelectedDocumentId(docId);
    setLiveResults([]);
    setConversations([]);
    shouldScrollRef.current = false;
    fetchConversations(docId);
  }

  // Auto-scroll to bottom only when new live messages appear or loading starts
  useEffect(() => {
    if (shouldScrollRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveResults, loading]);

  async function handleQuery(query: string) {
    if (!selectedDocumentId || loading) return;

    setLoading(true);
    shouldScrollRef.current = true;

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, document_id: selectedDocumentId }),
      });
      const data = await res.json();

      if (data.error) {
        setLiveResults((prev) => [
          ...prev,
          {
            query,
            result: { type: "text", text: `Error: ${data.error}`, citations: [] },
            chunks: [],
          },
        ]);
      } else {
        setLiveResults((prev) => [
          ...prev,
          {
            query,
            result: data.result,
            chunks: data.chunks || [],
            conversation_id: data.conversation_id,
          },
        ]);
      }
    } catch {
      setLiveResults((prev) => [
        ...prev,
        {
          query,
          result: {
            type: "text",
            text: "Failed to process query. Please try again.",
            citations: [],
          },
          chunks: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const hasMessages = conversations.length > 0 || liveResults.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-200 ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <DocumentSidebar
          documents={documents}
          loading={docsLoading}
          selectedId={selectedDocumentId}
          onSelect={handleSelectDocument}
          onRefresh={fetchDocuments}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="chat-header flex items-center gap-3 border-b border-slate-200 px-6 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Toggle sidebar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            {selectedDocument ? (
              <>
                <h1 className="text-sm font-semibold text-slate-800 truncate">
                  {selectedDocument.name}
                </h1>
                <p className="text-xs text-slate-500">
                  {selectedDocument.chunk_count} chunks &middot; Ask questions about this document
                </p>
              </>
            ) : (
              <>
                <h1 className="text-sm font-semibold text-slate-800">
                  RAG Citation Demo
                </h1>
                <p className="text-xs text-slate-500">
                  Anthropic-style inline citations with any LLM
                </p>
              </>
            )}
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!selectedDocumentId && <NoDocumentSelected />}

          {selectedDocumentId && !hasMessages && !loading && (
            <EmptyChat
              documentName={selectedDocument?.name || ""}
              onSuggestionClick={handleQuery}
            />
          )}

          {selectedDocumentId && hasMessages && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Historical conversations from DB */}
              {conversations.map((conv) => (
                <ChatMessage
                  key={conv.id}
                  query={conv.query}
                  result={{ type: "text", text: conv.answer, citations: conv.citations || [] } as CitationBlock}
                  chunks={conv.chunks_used || []}
                  isHistorical={true}
                />
              ))}

              {/* Live results from current session */}
              {liveResults.map((r, i) => (
                <ChatMessage
                  key={`live-${i}`}
                  query={r.query}
                  result={r.result}
                  chunks={r.chunks}
                />
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="ai-bubble rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: "0.15s" }}></span>
                        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: "0.3s" }}></span>
                      </div>
                      <span className="text-xs text-slate-400 ml-1">Searching & generating answer...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <ChatInput
            onSubmit={handleQuery}
            loading={loading}
            disabled={!selectedDocumentId}
          />
        </div>
      </div>
    </div>
  );
}
