import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";
import { runCitationPipeline, ChunkResult } from "@/lib/citations";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search for similar chunks via RPC
    const { data: chunks, error } = await supabase.rpc("rag_match_chunks", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 10,
    });

    if (error) {
      console.error("Vector search error:", error);
      return NextResponse.json(
        { error: "Failed to search documents" },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        result: {
          type: "text",
          text: "No relevant documents found. Please upload some papers first.",
          citations: [],
        },
        chunks: [],
      });
    }

    // 3. Run citation pipeline
    const result = await runCitationPipeline(chunks as ChunkResult[], query);

    return NextResponse.json({
      result,
      chunks: (chunks as ChunkResult[]).map((c) => ({
        id: c.id,
        document_name: c.document_name,
        chunk_index: c.chunk_index,
        similarity: c.similarity,
        content: c.content,
      })),
    });
  } catch (err) {
    console.error("Query error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
