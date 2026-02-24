import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();

  // Look up document by ID
  const { data: doc, error } = await supabase
    .from("rag_documents")
    .select("file_path, name")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const filePath: string = doc.file_path;

  try {
    let pdfBytes: Buffer;

    if (filePath.startsWith("preloaded/")) {
      // Read from local papers/ directory
      const filename = filePath.replace("preloaded/", "");
      const localPath = path.join(process.cwd(), "papers", filename);

      if (!fs.existsSync(localPath)) {
        return NextResponse.json(
          { error: "PDF file not found on server" },
          { status: 404 }
        );
      }

      pdfBytes = fs.readFileSync(localPath);
    } else if (filePath.startsWith("uploads/")) {
      // Download from Supabase storage
      const { data, error: dlError } = await supabase.storage
        .from("papers")
        .download(filePath);

      if (dlError || !data) {
        return NextResponse.json(
          { error: "Failed to download PDF from storage" },
          { status: 500 }
        );
      }

      pdfBytes = Buffer.from(await data.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "Unknown file path format" },
        { status: 400 }
      );
    }

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.name}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to serve PDF" },
      { status: 500 }
    );
  }
}
