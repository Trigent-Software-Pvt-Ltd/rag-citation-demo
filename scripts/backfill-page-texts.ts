/**
 * Backfill page_texts for existing documents.
 * Run with: npx tsx scripts/backfill-page-texts.ts
 */

import { createClient } from "@supabase/supabase-js";
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

// ── Per-page extraction ──────────────────────────────────────────────────────

interface PageData {
  pageIndex: number;
  getTextContent: (opts: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }) => Promise<{
    items: Array<{ str: string; transform: number[] }>;
  }>;
}

async function extractPageTexts(buffer: Buffer): Promise<string[]> {
  const pageTexts: string[] = [];

  await pdfParse(buffer, {
    pagerender: (pageData: PageData) => {
      return pageData
        .getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        })
        .then((textContent) => {
          let lastY: number | undefined;
          let text = "";
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === undefined) {
              text += item.str;
            } else {
              text += "\n" + item.str;
            }
            lastY = item.transform[5];
          }
          pageTexts[pageData.pageIndex] = text;
          return text;
        });
    },
  });

  return pageTexts;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Get all documents that don't have page_texts yet
  const { data: docs, error } = await supabase
    .from("rag_documents")
    .select("id, name, file_path")
    .is("page_texts", null);

  if (error) {
    console.error("Failed to fetch documents:", error.message);
    process.exit(1);
  }

  if (!docs || docs.length === 0) {
    console.log("All documents already have page_texts. Nothing to do.");
    return;
  }

  console.log(`Found ${docs.length} documents without page_texts.\n`);

  for (const doc of docs) {
    console.log(`Processing: ${doc.name}`);

    try {
      let buffer: Buffer;

      if (doc.file_path?.startsWith("preloaded/")) {
        const filename = doc.file_path.replace("preloaded/", "");
        const localPath = path.join(process.cwd(), "papers", filename);
        if (!fs.existsSync(localPath)) {
          console.log(`  File not found: ${localPath}, skipping.`);
          continue;
        }
        buffer = fs.readFileSync(localPath);
      } else if (doc.file_path?.startsWith("uploads/")) {
        const { data, error: dlError } = await supabase.storage
          .from("papers")
          .download(doc.file_path);
        if (dlError || !data) {
          console.log(`  Failed to download from storage: ${dlError?.message}`);
          continue;
        }
        buffer = Buffer.from(await data.arrayBuffer());
      } else {
        console.log(`  Unknown file_path format: ${doc.file_path}, skipping.`);
        continue;
      }

      const rawPageTexts = await extractPageTexts(buffer);
      // Sanitize: remove null bytes and invalid Unicode escapes
      const pageTexts = rawPageTexts.map((t) =>
        t.replace(/\u0000/g, "").replace(/\\u0000/g, "")
      );
      console.log(`  Extracted ${pageTexts.length} pages of text.`);

      const { error: updateError } = await supabase
        .from("rag_documents")
        .update({ page_texts: pageTexts })
        .eq("id", doc.id);

      if (updateError) {
        console.error(`  Update failed: ${updateError.message}`);
      } else {
        console.log(`  Saved page_texts to database.`);
      }
    } catch (err) {
      console.error(`  Error processing ${doc.name}:`, err);
    }
  }

  console.log("\nBackfill complete!");
}

main().catch(console.error);
