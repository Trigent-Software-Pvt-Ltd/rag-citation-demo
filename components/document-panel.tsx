"use client";

import { useState, useRef } from "react";

interface Document {
  id: string;
  name: string;
  file_size: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

export default function DocumentPanel({
  documents,
  onRefresh,
}: {
  documents: Document[];
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

  async function handleDelete(id: string) {
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
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Documents</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {documents.length} paper{documents.length !== 1 ? "s" : ""} indexed
        </p>
      </div>

      {/* Upload */}
      <div className="border-b border-zinc-200 px-4 py-3">
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-xs font-medium transition-colors ${
            uploading
              ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-wait"
              : "border-zinc-300 text-zinc-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
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
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
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
          <p className="mt-1.5 text-xs text-zinc-500">{uploadProgress}</p>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-zinc-400">
            No documents yet. Upload a PDF or run the pre-load script.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group px-4 py-2.5 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-700 truncate leading-5">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatSize(doc.file_size)} &middot; {doc.chunk_count}{" "}
                      chunks
                      {doc.status === "processing" && (
                        <span className="ml-1 text-amber-500">
                          &middot; processing
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="mt-0.5 hidden text-zinc-300 hover:text-red-500 group-hover:block"
                    title="Remove document"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
