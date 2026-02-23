"use client";

import { useState } from "react";
import type { Chunk } from "@/lib/types";

export default function ChunksPanel({ chunks }: { chunks: Chunk[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (chunks.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
        Retrieved Sources ({chunks.length} chunks)
      </h3>
      <div className="space-y-2">
        {chunks.map((chunk, i) => (
          <div
            key={chunk.id}
            className="rounded-lg border border-zinc-200 bg-white overflow-hidden"
          >
            <button
              onClick={() =>
                setExpanded(expanded === chunk.id ? null : chunk.id)
              }
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-zinc-700 truncate">
                  {chunk.document_name}
                </span>
                <span className="text-[10px] text-zinc-400 flex-shrink-0">
                  chunk #{chunk.chunk_index + 1}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-zinc-400">
                  {(chunk.similarity * 100).toFixed(1)}% match
                </span>
                <svg
                  className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
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
              <div className="border-t border-zinc-100 px-3 py-2.5 bg-zinc-50">
                <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
