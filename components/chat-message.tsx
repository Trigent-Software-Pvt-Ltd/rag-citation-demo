"use client";

import CitationDisplay from "@/components/citation-display";
import ChunksPanel from "@/components/chunks-panel";
import type { CitationBlock, Chunk, ChunkSummary } from "@/lib/types";

interface ChatMessageProps {
  query: string;
  result: CitationBlock;
  chunks: (Chunk | ChunkSummary)[];
  isHistorical?: boolean;
}

export default function ChatMessage({ query, result, chunks, isHistorical }: ChatMessageProps) {
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
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {result.citations.length} citation{result.citations.length !== 1 ? "s" : ""} &middot; hover or click to view source
              </p>
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
