/**
 * Pre-load papers from the papers/ folder into Supabase.
 * Run with: npx tsx scripts/load-papers.ts
 */

import { createClient } from "@supabase/supabase-js";
import { AzureOpenAI } from "openai";
import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

// ── Load env ─────────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    process.env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const embeddingClient = new AzureOpenAI({
  apiKey: process.env.AZURE_EMBED_API_KEY!,
  endpoint: process.env.AZURE_EMBED_ENDPOINT!,
  apiVersion: "2024-06-01",
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);

    if (end >= cleaned.length) {
      const chunk = cleaned.slice(start).trim();
      if (chunk.length > 50) chunks.push(chunk);
      break;
    }

    let breakPoint = end;
    const searchFrom = cleaned.substring(start, end);

    const lastPara = searchFrom.lastIndexOf("\n\n");
    if (lastPara > chunkSize * 0.3) {
      breakPoint = start + lastPara;
    } else {
      const lastSentence = searchFrom.lastIndexOf(". ");
      if (lastSentence > chunkSize * 0.3) {
        breakPoint = start + lastSentence + 2;
      } else {
        const lastSpace = searchFrom.lastIndexOf(" ");
        if (lastSpace > chunkSize * 0.3) {
          breakPoint = start + lastSpace + 1;
        }
      }
    }

    const chunk = cleaned.slice(start, breakPoint).trim();
    if (chunk.length > 50) chunks.push(chunk);

    const nextStart = breakPoint - overlap;
    start = Math.max(nextStart, start + Math.floor(chunkSize * 0.5));
  }

  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 16;
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await embeddingClient.embeddings.create({
      model: process.env.AZURE_EMBED_DEPLOYMENT || "text-embedding-3-small",
      input: batch,
    });
    for (const item of res.data) {
      all.push(item.embedding);
    }
    // Small delay to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return all;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function loadPaper(filePath: string) {
  const fileName = path.basename(filePath, ".pdf");
  console.log(`\nProcessing: ${fileName}`);

  // Check if already loaded
  const { data: existing } = await supabase
    .from("rag_documents")
    .select("id")
    .eq("name", fileName)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log("  Already loaded, skipping.");
    return;
  }

  // Read PDF
  const buffer = fs.readFileSync(filePath);
  let text: string;
  try {
    const pdfData = await pdfParse(buffer);
    text = pdfData.text;
  } catch (err) {
    console.error(`  Failed to parse PDF: ${err}`);
    return;
  }

  if (text.length < 100) {
    console.log("  Too little text extracted, skipping.");
    return;
  }

  // Skip storage upload for preloaded papers (large files can timeout)
  // Create document record
  const { data: doc, error: docErr } = await supabase
    .from("rag_documents")
    .insert({
      name: fileName,
      file_path: `preloaded/${path.basename(filePath)}`,
      file_size: buffer.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    console.error(`  Document insert failed: ${docErr?.message}`);
    return;
  }

  // Chunk
  const chunks = chunkText(text);
  console.log(`  Extracted ${text.length} chars → ${chunks.length} chunks`);

  // Embed
  console.log("  Generating embeddings...");
  const embeddings = await generateEmbeddings(chunks);

  // Insert chunks in batches
  const records = chunks.map((content, i) => ({
    document_id: doc.id,
    chunk_index: i,
    content,
    embedding: JSON.stringify(embeddings[i]),
  }));

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error: chunkErr } = await supabase
      .from("rag_document_chunks")
      .insert(batch);
    if (chunkErr) {
      console.error(`  Chunk batch insert error: ${chunkErr.message}`);
    }
  }

  // Update status
  await supabase
    .from("rag_documents")
    .update({ status: "ready", chunk_count: chunks.length })
    .eq("id", doc.id);

  console.log(`  Done! ${chunks.length} chunks indexed.`);
}

async function main() {
  const papersDir = path.resolve(process.cwd(), "papers");

  if (!fs.existsSync(papersDir)) {
    console.error("papers/ folder not found");
    process.exit(1);
  }

  const files = fs
    .readdirSync(papersDir)
    .filter((f) => f.endsWith(".pdf"))
    .map((f) => path.join(papersDir, f));

  console.log(`Found ${files.length} PDFs in papers/`);

  for (const file of files) {
    await loadPaper(file);
  }

  console.log("\nAll papers processed!");
}

main().catch(console.error);
