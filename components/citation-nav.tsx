"use client";

import type { Citation } from "@/lib/types";

interface CitationNavProps {
  citations: Citation[];
  activeCitationIndex: number;
  citationPages: (number | null)[];
  onGoToCitation: (index: number) => void;
  onClose: () => void;
}

export default function CitationNav({
  citations,
  activeCitationIndex,
  citationPages,
  onGoToCitation,
  onClose,
}: CitationNavProps) {
  const total = citations.length;
  const current = activeCitationIndex + 1;
  const activeCitation = citations[activeCitationIndex];
  const activePage = citationPages[activeCitationIndex];

  function prev() {
    const idx = activeCitationIndex > 0 ? activeCitationIndex - 1 : total - 1;
    onGoToCitation(idx);
  }

  function next() {
    const idx = activeCitationIndex < total - 1 ? activeCitationIndex + 1 : 0;
    onGoToCitation(idx);
  }

  // Truncate citation text for preview
  const previewText = activeCitation?.chunk_sentences_text || "";
  const truncated =
    previewText.length > 120
      ? previewText.slice(0, 120) + "..."
      : previewText;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Citation icon */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center text-xs font-bold">
            {current}
          </div>

          {/* Nav buttons */}
          <button
            onClick={prev}
            className="p-1 rounded hover:bg-amber-100 text-amber-700"
            title="Previous citation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs text-amber-800 font-medium whitespace-nowrap">
            Citation {current} of {total}
            {activePage && (
              <span className="text-amber-600 font-normal"> &middot; Page {activePage}</span>
            )}
          </span>
          <button
            onClick={next}
            className="p-1 rounded hover:bg-amber-100 text-amber-700"
            title="Next citation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-amber-100 text-amber-600"
          title="Close PDF viewer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Citation preview */}
      {truncated && (
        <p className="text-[11px] text-amber-700 mt-1 leading-relaxed line-clamp-2">
          &ldquo;{truncated}&rdquo;
        </p>
      )}
    </div>
  );
}
