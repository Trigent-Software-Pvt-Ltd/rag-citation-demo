import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("rag_documents")
      .select("id, name, file_size, chunk_count, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch documents error:", error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: data });
  } catch (err) {
    console.error("Documents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
