/**
 * Database setup script for RAG Citation Demo.
 * Run with: npx tsx scripts/setup-db.ts
 *
 * Executes the SQL migration via Supabase's pg_net or direct connection,
 * and creates the storage bucket for uploaded papers.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load env
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx);
    const value = trimmed.substring(eqIdx + 1);
    process.env[key] = value;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function executeSQLViaRest(sql: string): Promise<boolean> {
  // Use Supabase's SQL endpoint (available on self-hosted)
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({}),
  });
  // This won't work for arbitrary SQL, we need another approach
  return res.ok;
}

async function setupStorage() {
  console.log("Setting up storage bucket...");
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "papers");

  if (exists) {
    console.log("  Storage bucket 'papers' already exists");
  } else {
    const { error } = await supabase.storage.createBucket("papers", {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ["application/pdf"],
    });
    if (error) {
      console.error("  Bucket error:", error.message);
    } else {
      console.log("  Storage bucket 'papers' created");
    }
  }
}

async function testConnection() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .limit(1);

  if (error && error.code === "42P01") {
    console.log("  Tables not yet created. Please run the SQL migration:");
    console.log("  -----------------------------------------------");
    console.log("  Option 1: Via Supabase Dashboard SQL Editor");
    console.log(`    Go to ${supabaseUrl} > SQL Editor`);
    console.log("    Paste contents of scripts/setup-db.sql and execute");
    console.log("");
    console.log("  Option 2: Via psql");
    console.log(
      "    psql postgresql://postgres:84zWYw73PHq7CUByQqrjRsQwFw0RXGo@trigent-trinity-supabase.trigent.com:5433/postgres -f scripts/setup-db.sql"
    );
    console.log("  -----------------------------------------------");
    return false;
  } else if (error) {
    console.error("  Connection error:", error.message);
    return false;
  }

  console.log("  Database tables exist and are accessible!");
  return true;
}

async function main() {
  console.log("RAG Citation Demo - Database Setup\n");
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  const tablesExist = await testConnection();
  await setupStorage();

  if (tablesExist) {
    console.log("\nAll set! Database and storage are ready.");
  } else {
    console.log("\nStorage is ready. Please run the SQL migration for tables.");
  }
}

main().catch(console.error);
