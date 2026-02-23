// pdf-parse v1.1.1 - CommonJS module with default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function extractTextFromPDF(
  buffer: Buffer
): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Split text into chunks with overlap for better context preservation.
 * Tries to split on paragraph/sentence boundaries.
 */
export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
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

    // Find a good break point near the end of the chunk
    let breakPoint = end;
    const searchFrom = cleaned.substring(start, end);

    // Try paragraph boundary
    const lastPara = searchFrom.lastIndexOf("\n\n");
    if (lastPara > chunkSize * 0.3) {
      breakPoint = start + lastPara;
    } else {
      // Try sentence boundary
      const lastSentence = searchFrom.lastIndexOf(". ");
      if (lastSentence > chunkSize * 0.3) {
        breakPoint = start + lastSentence + 2;
      } else {
        // Try any space
        const lastSpace = searchFrom.lastIndexOf(" ");
        if (lastSpace > chunkSize * 0.3) {
          breakPoint = start + lastSpace + 1;
        }
      }
    }

    const chunk = cleaned.slice(start, breakPoint).trim();
    if (chunk.length > 50) chunks.push(chunk);

    // Move forward, but ensure we always make progress
    const nextStart = breakPoint - overlap;
    start = Math.max(nextStart, start + Math.floor(chunkSize * 0.5));
  }

  return chunks;
}
