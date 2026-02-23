"use client";

import { useState, useRef } from "react";
import type { Document } from "@/lib/types";

export default function DocumentSidebar({
  documents,
  selectedId,
  onSelect,
  onRefresh,
}: {
  documents: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress("Uploading & processing...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setUploadProgress(`Error: ${data.error}`);
      } else {
        setUploadProgress(`Done! ${data.chunk_count} chunks indexed.`);
        onRefresh();
      }
    } catch {
      setUploadProgress("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadProgress(""), 4000);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Documents</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {documents.length} paper{documents.length !== 1 ? "s" : ""} indexed
        </p>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-3">
        {documents.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-slate-400">
            No documents yet. Upload a PDF to get started.
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => {
              const isSelected = selectedId === doc.id;
              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(doc.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(doc.id); }}
                  className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium leading-5 truncate ${
                        isSelected ? "text-blue-900" : "text-slate-700"
                      }`}
                    >
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatSize(doc.file_size)} &middot; {doc.chunk_count} chunks
                      {doc.status === "processing" && (
                        <span className="ml-1 text-amber-500">&middot; processing</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="mt-1 hidden flex-shrink-0 text-slate-300 hover:text-red-500 group-hover:block"
                    title="Remove document"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload at bottom */}
      <div className="border-t border-slate-200 px-4 py-3">
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
            uploading
              ? "border-slate-200 bg-slate-50 text-slate-400 cursor-wait"
              : "border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
          </svg>
          {uploading ? "Processing..." : "Upload PDF"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        {uploadProgress && (
          <p className="mt-1.5 text-xs text-slate-500 text-center">{uploadProgress}</p>
        )}
      </div>
    </div>
  );
}
