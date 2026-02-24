"use client";

import { useState } from "react";
import type { Chunk } from "@/lib/types";

export default function ChunksPanel({ chunks }: { chunks: Chunk[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (chunks.length === 0) return null;

  // Check if all chunks are from the same document (per-doc mode)
  const allSameDoc = chunks.every((c) => c.document_name === chunks[0].document_name);
  const visibleChunks = showAll ? chunks : chunks.slice(0, 3);

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowAll(!showAll)}
        className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 hover:text-slate-700 transition-colors"
      >
        {showAll ? "Hide" : "Show"} Sources ({chunks.length} chunks)
        <svg
          className={`inline-block ml-1 h-3 w-3 transition-transform ${showAll ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {showAll && (
        <div className="space-y-1.5">
          {visibleChunks.map((chunk, i) => (
            <div
              key={chunk.id}
              className="rounded-lg border border-slate-200 bg-white overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === chunk.id ? null : chunk.id)
                }
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {i + 1}
                  </span>
                  {!allSameDoc && (
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {chunk.document_name}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    Chunk #{chunk.chunk_index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-400">
                    {(chunk.similarity * 100).toFixed(1)}%
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                      expanded === chunk.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
              </button>
              {expanded === chunk.id && (
                <div className="border-t border-slate-100 px-3 py-2.5 bg-slate-50">
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
