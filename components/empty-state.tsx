"use client";

export function NoDocumentSelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center mb-5">
        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-slate-700 mb-2">
        Select a document
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed">
        Choose a paper from the sidebar to start a conversation. Your questions will be answered using only that document&apos;s content, with inline citations.
      </p>
    </div>
  );
}

export function EmptyChat({ documentName }: { documentName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center mb-5">
        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-slate-700 mb-2">
        Chat with &ldquo;{documentName}&rdquo;
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">
        Ask a question below. Answers include{" "}
        <span className="underline decoration-dotted decoration-blue-500 decoration-2 underline-offset-2">
          inline citations
        </span>{" "}
        — hover or click to see the exact source text.
      </p>
    </div>
  );
}
