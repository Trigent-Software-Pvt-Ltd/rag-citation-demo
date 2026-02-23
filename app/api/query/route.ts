import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";
import { runCitationPipeline, ChunkResult } from "@/lib/citations";

export async function POST(req: NextRequest) {
  try {
    const { query, document_id } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Generate embedding for the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (err) {
      console.error("Embedding generation error:", err);
      return NextResponse.json(
        { error: "Failed to generate query embedding. Check Azure OpenAI credentials." },
        { status: 500 }
      );
    }

    // 2. Search for similar chunks via RPC (optionally filtered by document)
    const rpcParams: Record<string, unknown> = {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 10,
    };
    if (document_id) {
      rpcParams.filter_document_id = document_id;
    }

    const { data: chunks, error } = await supabase.rpc(
      "rag_match_chunks",
      rpcParams
    );

    if (error) {
      console.error("Vector search error:", error);
      return NextResponse.json(
        { error: `Vector search failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        result: {
          type: "text",
          text: "No relevant content found in this document. Try a different question.",
          citations: [],
        },
        chunks: [],
      });
    }

    // 3. Run citation pipeline
    let result;
    try {
      result = await runCitationPipeline(chunks as ChunkResult[], query);
    } catch (err) {
      console.error("LLM citation pipeline error:", err);
      return NextResponse.json(
        { error: "Failed to generate answer. Check Azure OpenAI chat credentials." },
        { status: 500 }
      );
    }

    const responseChunks = (chunks as ChunkResult[]).map((c) => ({
      id: c.id,
      document_name: c.document_name,
      chunk_index: c.chunk_index,
      similarity: c.similarity,
      content: c.content,
    }));

    // 4. Save conversation to DB if document_id provided
    let conversation_id: string | undefined;
    if (document_id) {
      try {
        const { data: conv } = await supabase
          .from("rag_conversations")
          .insert({
            document_id,
            query,
            answer: result.text,
            citations: result.citations,
            chunks_used: responseChunks.map((c) => ({
              id: c.id,
              document_name: c.document_name,
              chunk_index: c.chunk_index,
              similarity: c.similarity,
            })),
          })
          .select("id")
          .single();
        conversation_id = conv?.id;
      } catch (err) {
        // Non-fatal: log but don't fail the response
        console.error("Failed to save conversation:", err);
      }
    }

    return NextResponse.json({
      result,
      chunks: responseChunks,
      conversation_id,
    });
  } catch (err) {
    console.error("Query error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
