import { AzureOpenAI } from "openai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChunkResult {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  document_name: string;
}

export interface Sentence {
  sentence_id: number;
  text: string;
  start_char: number;
  end_char: number;
}

export interface Citation {
  chunk_id: number;
  sentences_range: string;
  answer_snippet: string;
  answer_snippet_start: number;
  answer_snippet_end: number;
  chunk_sentences_text: string;
  chunk_sentences_start: number;
  chunk_sentences_end: number;
  document_name: string;
  chunk_index: number;
}

export interface CitationBlock {
  type: "text";
  text: string;
  citations: Citation[];
}

// ─── Sentence Parsing ────────────────────────────────────────────────────────

export function parseChunkIntoSentences(chunkText: string): Sentence[] {
  // Split on sentence-ending punctuation followed by space or end
  const rawParts = chunkText.split(/(?<=[.!?])\s+/);
  const sentences: Sentence[] = [];
  let offset = 0;

  for (let i = 0; i < rawParts.length; i++) {
    const text = rawParts[i].trim();
    if (!text) continue;

    const startChar = chunkText.indexOf(text, offset);
    const endChar = startChar + text.length;

    sentences.push({
      sentence_id: i + 1,
      text,
      start_char: startChar >= 0 ? startChar : offset,
      end_char: startChar >= 0 ? endChar : offset + text.length,
    });

    offset = endChar;
  }

  return sentences;
}

// ─── LLM Call with Citation Instructions ─────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful research assistant. You have a collection of text chunks from academic papers.

Write a clear, well-structured answer to the user's question based ONLY on the provided chunks.

When you reference or rely on information from a chunk, cite it inline using this exact format:
  <CIT chunk_id='N' sentences='X-Y'>your answer text that uses this source</CIT>

Rules:
- N is the chunk index number (0-based).
- X-Y is the sentence range within that chunk (1-based). Use X-X for a single sentence.
- The text inside <CIT> tags is YOUR answer text (not copied chunk text).
- Only wrap the specific phrases that rely on a source, not entire paragraphs.
- You may have uncited text for transitions, introductions, or your own synthesis.
- Be thorough but concise. Use multiple citations when drawing from multiple chunks.

Example:
According to the research, <CIT chunk_id='2' sentences='1-3'>machine learning models benefit from larger datasets</CIT>, and furthermore <CIT chunk_id='5' sentences='2-2'>transfer learning can reduce training time significantly</CIT>.`;

export async function callLLMWithCitations(
  chunks: ChunkResult[],
  userQuery: string
): Promise<string> {
  const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    endpoint: process.env.AZURE_OPENAI_BASE_URL!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview",
  });

  const chunksInfo = chunks
    .map((c, i) => `[Chunk ${i}] (from "${c.document_name}")\n${c.content}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4.1-nano",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${chunksInfo}\n\nQuestion: ${userQuery}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  return response.choices[0].message.content || "";
}

// ─── Parse LLM Response ─────────────────────────────────────────────────────

export function parseResponseWithCitations(responseText: string): {
  text: string;
  rawCitations: Array<{
    chunk_id: number;
    sentences_range: string;
    answer_snippet: string;
    answer_snippet_start: number;
    answer_snippet_end: number;
  }>;
} {
  // Match CIT tags - handles both closed </CIT> and unclosed variants
  // Also handles the case where the LLM puts the CIT tag as a marker (no inner text)
  const pattern =
    /<CIT\s+chunk_id=['"](\d+)['"]\s+sentences=['"](\d+-\d+)['"]>([\s\S]*?)<\/CIT>/g;

  let finalText = "";
  const rawCitations: Array<{
    chunk_id: number;
    sentences_range: string;
    answer_snippet: string;
    answer_snippet_start: number;
    answer_snippet_end: number;
  }> = [];

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(responseText)) !== null) {
    const textBefore = responseText.slice(lastIndex, match.index);
    finalText += textBefore;

    const chunkId = parseInt(match[1], 10);
    const sentRange = match[2];
    const snippet = match[3];

    const startInAnswer = finalText.length;
    finalText += snippet;
    const endInAnswer = finalText.length;

    rawCitations.push({
      chunk_id: chunkId,
      sentences_range: sentRange,
      answer_snippet: snippet,
      answer_snippet_start: startInAnswer,
      answer_snippet_end: endInAnswer,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  finalText += responseText.slice(lastIndex);

  // If no citations found with closed tags, try unclosed marker style:
  // <CIT chunk_id='N' sentences='X-Y'> (no closing tag, used as inline marker)
  if (rawCitations.length === 0) {
    const markerPattern =
      /<CIT\s+chunk_id=['"](\d+)['"]\s+sentences=['"](\d+-\d+)['"]>/g;
    // Find all markers and the text segments between them
    const markers: Array<{
      index: number;
      length: number;
      chunkId: number;
      sentRange: string;
    }> = [];
    let m;
    while ((m = markerPattern.exec(responseText)) !== null) {
      markers.push({
        index: m.index,
        length: m[0].length,
        chunkId: parseInt(m[1], 10),
        sentRange: m[2],
      });
    }

    if (markers.length > 0) {
      finalText = "";
      lastIndex = 0;
      for (const marker of markers) {
        // Text before the marker
        const before = responseText.slice(lastIndex, marker.index);
        finalText += before;

        // Text after the marker until next marker or end of text
        const afterStart = marker.index + marker.length;
        const nextMarkerIdx = markers.find(
          (mm) => mm.index > marker.index
        )?.index;
        // Find the end of the cited snippet - until next sentence or next CIT
        let snippetEnd = nextMarkerIdx || responseText.length;
        // Try to find a sentence boundary
        const nextPeriod = responseText.indexOf(". ", afterStart);
        if (nextPeriod > 0 && nextPeriod < snippetEnd) {
          snippetEnd = nextPeriod + 1;
        }
        const snippet = responseText.slice(afterStart, snippetEnd).trim();

        const startInAnswer = finalText.length;
        finalText += snippet;
        const endInAnswer = finalText.length;

        rawCitations.push({
          chunk_id: marker.chunkId,
          sentences_range: marker.sentRange,
          answer_snippet: snippet,
          answer_snippet_start: startInAnswer,
          answer_snippet_end: endInAnswer,
        });

        lastIndex = snippetEnd;
      }
      finalText += responseText.slice(lastIndex);
    }
  }

  return { text: finalText, rawCitations };
}

// ─── Enrich Citations with Source Text ────────────────────────────────────────

export function enrichCitations(
  rawCitations: Array<{
    chunk_id: number;
    sentences_range: string;
    answer_snippet: string;
    answer_snippet_start: number;
    answer_snippet_end: number;
  }>,
  chunks: ChunkResult[],
  sentenceMap: Map<number, Sentence[]>
): Citation[] {
  return rawCitations.map((rc) => {
    const chunk = chunks[rc.chunk_id];
    const sentences = sentenceMap.get(rc.chunk_id) || [];

    let startSent = 1,
      endSent = 1;
    try {
      const parts = rc.sentences_range.split("-");
      startSent = parseInt(parts[0], 10);
      endSent = parseInt(parts[1], 10);
    } catch {
      // fallback
    }

    const relevantSents = sentences.filter(
      (s) => s.sentence_id >= startSent && s.sentence_id <= endSent
    );

    const chunkSentencesText = relevantSents.map((s) => s.text).join(" ");
    const chunkSentencesStart =
      relevantSents.length > 0 ? relevantSents[0].start_char : -1;
    const chunkSentencesEnd =
      relevantSents.length > 0
        ? relevantSents[relevantSents.length - 1].end_char
        : -1;

    return {
      ...rc,
      chunk_sentences_text: chunkSentencesText,
      chunk_sentences_start: chunkSentencesStart,
      chunk_sentences_end: chunkSentencesEnd,
      document_name: chunk?.document_name || "Unknown",
      chunk_index: chunk?.chunk_index ?? rc.chunk_id,
    };
  });
}

// ─── Full Pipeline ───────────────────────────────────────────────────────────

export async function runCitationPipeline(
  chunks: ChunkResult[],
  userQuery: string
): Promise<CitationBlock> {
  // 1. Parse each chunk into sentences
  const sentenceMap = new Map<number, Sentence[]>();
  for (let i = 0; i < chunks.length; i++) {
    sentenceMap.set(i, parseChunkIntoSentences(chunks[i].content));
  }

  // 2. Call LLM with citation instructions
  const rawResponse = await callLLMWithCitations(chunks, userQuery);

  // 3. Parse the response
  const { text, rawCitations } = parseResponseWithCitations(rawResponse);

  // 4. Enrich citations with source sentence data
  const citations = enrichCitations(rawCitations, chunks, sentenceMap);

  return {
    type: "text",
    text,
    citations,
  };
}
