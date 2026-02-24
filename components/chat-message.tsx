"use client";

import CitationDisplay from "@/components/citation-display";
import ChunksPanel from "@/components/chunks-panel";
import type { CitationBlock, Chunk, ChunkSummary } from "@/lib/types";

interface ChatMessageProps {
  query: string;
  result: CitationBlock;
  chunks: (Chunk | ChunkSummary)[];
  isHistorical?: boolean;
  onViewInPdf?: (citations: CitationBlock["citations"]) => void;
}

export default function ChatMessage({ query, result, chunks, isHistorical, onViewInPdf }: ChatMessageProps) {
  return (
    <div className="chat-message-group">
      {/* User message */}
      <div className="flex justify-end mb-3">
        <div className="user-bubble max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="text-sm text-white leading-relaxed">{query}</p>
        </div>
      </div>

      {/* AI response */}
      <div className="flex justify-start mb-2">
        <div className="ai-bubble max-w-[90%] rounded-2xl rounded-bl-md px-5 py-4">
          <CitationDisplay block={result} />

          {result.citations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {result.citations.length} citation{result.citations.length !== 1 ? "s" : ""} &middot; hover or click to view source
              </p>
              {onViewInPdf && (
                <button
                  onClick={() => onViewInPdf(result.citations)}
                  className="view-in-pdf-btn flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 uppercase tracking-wider transition-colors"
                  title="View citations in PDF"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  View in PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chunks - only show full content for live results */}
      {chunks.length > 0 && !isHistorical && (
        <div className="ml-2">
          <ChunksPanel chunks={chunks as Chunk[]} />
        </div>
      )}

      {/* Historical chunks summary */}
      {chunks.length > 0 && isHistorical && (
        <div className="ml-2 mt-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">
            {chunks.length} source chunks used
          </p>
        </div>
      )}
    </div>
  );
}
