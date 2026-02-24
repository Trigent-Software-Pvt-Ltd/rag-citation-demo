import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { extractTextFromPDF, extractPageTexts, chunkText } from "@/lib/pdf";
import { generateEmbeddings } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "A PDF file is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Upload file to Supabase storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `uploads/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // 2. Create document record
    const { data: doc, error: docError } = await supabase
      .from("rag_documents")
      .insert({
        name: file.name.replace(".pdf", ""),
        file_path: storagePath,
        file_size: file.size,
        status: "processing",
      })
      .select("id")
      .single();

    if (docError || !doc) {
      console.error("Document insert error:", docError);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    // 3. Extract text and chunk
    const [text, pageTexts] = await Promise.all([
      extractTextFromPDF(buffer),
      extractPageTexts(buffer),
    ]);
    const chunks = chunkText(text);

    // 4. Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    // 5. Insert chunks with embeddings
    const chunkRecords = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: JSON.stringify(embeddings[i]),
    }));

    // Insert in batches of 50
    for (let i = 0; i < chunkRecords.length; i += 50) {
      const batch = chunkRecords.slice(i, i + 50);
      const { error: chunkError } = await supabase
        .from("rag_document_chunks")
        .insert(batch);
      if (chunkError) {
        console.error("Chunk insert error:", chunkError);
      }
    }

    // 6. Update document status and store page texts
    await supabase
      .from("rag_documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
        page_texts: pageTexts,
      })
      .eq("id", doc.id);

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      chunk_count: chunks.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
