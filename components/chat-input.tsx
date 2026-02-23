"use client";

import { useState } from "react";

interface ChatInputProps {
  onSubmit: (query: string) => void;
  loading: boolean;
  disabled: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSubmit, loading, disabled, placeholder }: ChatInputProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading || disabled) return;
    onSubmit(query.trim());
    setQuery("");
  }

  return (
    <form onSubmit={handleSubmit} className="chat-input-bar">
      <div className="mx-auto max-w-3xl">
        <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-2.5 shadow-sm transition-all duration-200 ${
          disabled
            ? "border-slate-200 opacity-60"
            : "border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
        }`}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={disabled ? "Select a document to start chatting" : placeholder || "Ask a question about this document..."}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            disabled={loading || disabled}
          />
          <button
            type="submit"
            disabled={loading || disabled || !query.trim()}
            className="flex-shrink-0 rounded-xl bg-blue-500 px-4 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Thinking...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                Send
              </span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
