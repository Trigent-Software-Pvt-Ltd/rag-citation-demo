import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const document_id = req.nextUrl.searchParams.get("document_id");
    if (!document_id) {
      return NextResponse.json(
        { error: "document_id is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("rag_conversations")
      .select("*")
      .eq("document_id", document_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Conversations fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (err) {
    console.error("Conversations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
