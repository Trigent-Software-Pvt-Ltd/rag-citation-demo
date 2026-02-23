import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST() {
  try {
    const supabase = getServiceSupabase();

    // Test if tables exist
    const { error: testError } = await supabase
      .from("rag_documents")
      .select("id")
      .limit(1);

    if (testError && testError.code === "42P01") {
      return NextResponse.json({
        status: "needs_setup",
        message:
          "Database tables do not exist. Please run scripts/setup-db.sql against the database.",
      });
    }

    // Test if vector search works
    const { error: rpcError } = await supabase.rpc("rag_match_chunks", {
      query_embedding: JSON.stringify(new Array(1536).fill(0)),
      match_threshold: 0.0,
      match_count: 1,
    });

    if (rpcError) {
      return NextResponse.json({
        status: "partial",
        message: `Tables exist but vector search function may not be set up: ${rpcError.message}`,
      });
    }

    // Check storage bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = buckets?.some((b) => b.name === "papers");

    if (!hasBucket) {
      await supabase.storage.createBucket("papers", {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ["application/pdf"],
      });
    }

    // Get document count
    const { count } = await supabase
      .from("rag_documents")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      status: "ready",
      document_count: count || 0,
      storage_bucket: true,
    });
  } catch (err) {
    console.error("Setup check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
