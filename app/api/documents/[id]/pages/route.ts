import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data: doc, error } = await supabase
    .from("rag_documents")
    .select("page_texts")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!doc.page_texts) {
    return NextResponse.json(
      { error: "Page texts not available for this document" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    page_texts: doc.page_texts,
  });
}
