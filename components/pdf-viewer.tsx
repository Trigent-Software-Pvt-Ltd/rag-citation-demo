"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import CitationNav from "@/components/citation-nav";
import { findCitationInTextLayer, findCitationPage } from "@/lib/pdf-highlights";
import type { Citation } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  documentId: string;
  citations: Citation[];
  onClose: () => void;
}

export default function PdfViewer({
  documentId,
  citations,
  onClose,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activeCitationIndex, setActiveCitationIndex] = useState(0);
  const [pageTextContents, setPageTextContents] = useState<string[]>([]);
  const [citationPages, setCitationPages] = useState<(number | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const pdfUrl = useMemo(() => `/api/pdf/${documentId}`, [documentId]);

  // Fetch pre-extracted page texts from the database
  useEffect(() => {
    fetch(`/api/documents/${documentId}/pages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.page_texts) {
          setPageTextContents(data.page_texts);
        }
      })
      .catch((err) => console.error("Failed to fetch page texts:", err));
  }, [documentId]);

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setPdfError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error);
    setPdfError(`Failed to load PDF: ${error.message}`);
  }

  // Once page texts are loaded, find citation pages and jump to first one
  useEffect(() => {
    if (pageTextContents.length === 0 || citations.length === 0) return;

    const pages = citations.map((c) =>
      findCitationPage(c.chunk_sentences_text, pageTextContents)
    );
    setCitationPages(pages);

    // Jump to first citation's page
    if (pages[0]) {
      setCurrentPage(pages[0]);
    }
  }, [pageTextContents, citations]);

  // Navigate to a citation
  function goToCitation(index: number) {
    setActiveCitationIndex(index);
    const page = citationPages[index];
    if (page) {
      setCurrentPage(page);
    }
  }

  // Highlight citation text on the current page — retries until text layer is ready
  function highlightCitation(index: number, retries = 0) {
    // Clear previous highlights
    document.querySelectorAll(".pdf-highlight").forEach((el) => {
      el.classList.remove(
        "pdf-highlight",
        "pdf-highlight-active",
        "pdf-highlight-start"
      );
    });

    const citation = citations[index];
    if (!citation) return;

    const page = citationPages[index];
    if (!page) return;

    const pageDiv = pageRefs.current.get(page);
    if (!pageDiv) {
      if (retries < 10) {
        setTimeout(() => highlightCitation(index, retries + 1), 200);
      }
      return;
    }

    const textLayer = pageDiv.querySelector(".react-pdf__Page__textContent");
    if (!textLayer || textLayer.children.length === 0) {
      if (retries < 10) {
        setTimeout(() => highlightCitation(index, retries + 1), 200);
      }
      return;
    }

    // Use only leaf spans (no children) to avoid duplicate text from nested spans
    const allSpans = Array.from(
      textLayer.querySelectorAll("span")
    ) as HTMLElement[];
    const spans = allSpans.filter((s) => s.children.length === 0);
    const match = findCitationInTextLayer(citation.chunk_sentences_text, spans);

    if (match) {
      for (let i = match.startSpan; i <= match.endSpan; i++) {
        if (spans[i]) {
          spans[i].classList.add("pdf-highlight", "pdf-highlight-active");
          if (i === match.startSpan) {
            spans[i].classList.add("pdf-highlight-start");
          }
        }
      }
      // Scroll the first highlighted span into view
      spans[match.startSpan]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  // Re-highlight when page changes or citation pages are resolved
  useEffect(() => {
    if (citationPages.length === 0) return;
    const timer = setTimeout(() => highlightCitation(activeCitationIndex), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, citationPages, activeCitationIndex]);

  function nextPage() {
    setCurrentPage((p) => Math.min(p + 1, numPages));
  }

  function prevPage() {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }

  function zoomIn() {
    setScale((s) => Math.min(s + 0.2, 3.0));
  }

  function zoomOut() {
    setScale((s) => Math.max(s - 0.2, 0.4));
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 border-l border-slate-200">
      {/* Citation navigation */}
      {citations.length > 0 && (
        <CitationNav
          citations={citations}
          activeCitationIndex={activeCitationIndex}
          citationPages={citationPages}
          onGoToCitation={goToCitation}
          onClose={onClose}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-slate-600 min-w-[80px] text-center">
            Page {currentPage} of {numPages || "..."}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage >= numPages}
            className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next page"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="px-2 py-1 rounded hover:bg-slate-100"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <span className="text-slate-500 min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="px-2 py-1 rounded hover:bg-slate-100"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {citations.length === 0 && (
            <button
              onClick={onClose}
              className="ml-2 px-2 py-1 rounded hover:bg-slate-100 text-slate-500"
              title="Close PDF viewer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* PDF content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center py-4"
      >
        {pdfError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 px-6">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm">{pdfError}</p>
            </div>
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading PDF...
                </div>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              inputRef={(ref) => {
                if (ref) pageRefs.current.set(currentPage, ref);
              }}
              loading={
                <div className="w-[600px] h-[800px] bg-white rounded shadow flex items-center justify-center">
                  <span className="text-slate-400 text-sm">Loading page...</span>
                </div>
              }
              className="pdf-page-container"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
