"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Citation, CitationBlock } from "@/lib/types";

interface PopoverState {
  citation: Citation;
  x: number;
  y: number;
}

export default function CitationDisplay({ block }: { block: CitationBlock }) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [pinned, setPinned] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedCitations = [...block.citations].sort(
    (a, b) => a.answer_snippet_start - b.answer_snippet_start
  );

  const handleMouseEnter = useCallback(
    (citation: Citation, e: React.MouseEvent) => {
      if (pinned) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPopover({
        citation,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    },
    [pinned]
  );

  const handleMouseLeave = useCallback(() => {
    if (pinned) return;
    setPopover(null);
  }, [pinned]);

  const handleClick = useCallback(
    (citation: Citation, e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      if (
        pinned &&
        popover?.citation.answer_snippet_start === citation.answer_snippet_start
      ) {
        setPinned(false);
        setPopover(null);
      } else {
        setPopover({
          citation,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
        setPinned(true);
      }
    },
    [pinned, popover]
  );

  // Close pinned popover on outside click
  useEffect(() => {
    if (!pinned) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPinned(false);
        setPopover(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pinned]);

  // Build segments: alternating plain text and cited text
  const segments: Array<
    { type: "text"; content: string } | { type: "citation"; citation: Citation }
  > = [];
  let cursor = 0;

  for (const cit of sortedCitations) {
    if (cit.answer_snippet_start > cursor) {
      segments.push({
        type: "text",
        content: block.text.slice(cursor, cit.answer_snippet_start),
      });
    }
    segments.push({ type: "citation", citation: cit });
    cursor = cit.answer_snippet_end;
  }

  if (cursor < block.text.length) {
    segments.push({ type: "text", content: block.text.slice(cursor) });
  }

  // Color palette for different documents
  const docColors: Record<string, string> = {};
  const palette = [
    "rgb(59 130 246)",   // blue
    "rgb(16 185 129)",   // emerald
    "rgb(245 158 11)",   // amber
    "rgb(139 92 246)",   // violet
    "rgb(236 72 153)",   // pink
    "rgb(20 184 166)",   // teal
    "rgb(249 115 22)",   // orange
    "rgb(99 102 241)",   // indigo
  ];
  let colorIdx = 0;

  function getDocColor(docName: string) {
    if (!docColors[docName]) {
      docColors[docName] = palette[colorIdx % palette.length];
      colorIdx++;
    }
    return docColors[docName];
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="text-[15px] leading-7 text-zinc-800">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={i}>{seg.content}</span>;
          }

          const cit = seg.citation;
          const color = getDocColor(cit.document_name);
          const isActive =
            popover?.citation.answer_snippet_start ===
            cit.answer_snippet_start;

          return (
            <span
              key={i}
              className="cursor-pointer transition-all duration-150"
              style={{
                textDecorationLine: "underline",
                textDecorationStyle: "dotted",
                textDecorationColor: color,
                textDecorationThickness: "2px",
                textUnderlineOffset: "3px",
                backgroundColor: isActive ? `${color}15` : "transparent",
                borderRadius: "2px",
                padding: "0 1px",
              }}
              onMouseEnter={(e) => handleMouseEnter(cit, e)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleClick(cit, e)}
            >
              {cit.answer_snippet}
              <sup
                className="ml-0.5 text-[10px] font-semibold"
                style={{ color }}
              >
                [{cit.chunk_id + 1}]
              </sup>
            </span>
          );
        })}
      </div>

      {/* Citation Popover */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-[420px] max-h-[320px] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
          style={{
            left: Math.min(
              popover.x - 210,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 440
            ),
            top: popover.y,
          }}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{
                backgroundColor: getDocColor(popover.citation.document_name),
              }}
            >
              Source [{popover.citation.chunk_id + 1}]
            </span>
            {pinned && (
              <button
                onClick={() => {
                  setPinned(false);
                  setPopover(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                Close
              </button>
            )}
          </div>

          <div className="mb-2">
            <p className="text-xs font-medium text-zinc-500 mb-0.5">
              Document
            </p>
            <p className="text-sm text-zinc-800 font-medium truncate">
              {popover.citation.document_name}
            </p>
          </div>

          <div className="mb-2">
            <p className="text-xs font-medium text-zinc-500 mb-0.5">
              Chunk #{popover.citation.chunk_index + 1} &middot; Sentences{" "}
              {popover.citation.sentences_range}
            </p>
          </div>

          <div className="rounded-md bg-zinc-50 border border-zinc-100 p-3">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Source Text
            </p>
            <p className="text-sm text-zinc-700 leading-relaxed">
              &ldquo;{popover.citation.chunk_sentences_text}&rdquo;
            </p>
          </div>

          {popover.citation.chunk_sentences_start >= 0 && (
            <p className="mt-2 text-[10px] text-zinc-400">
              Characters {popover.citation.chunk_sentences_start}&ndash;
              {popover.citation.chunk_sentences_end} in chunk
            </p>
          )}
        </div>
      )}
    </div>
  );
}
