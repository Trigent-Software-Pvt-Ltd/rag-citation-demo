// Utility to match citation text against PDF.js text layer spans

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\[[\s\d,;\-–]*\]/g, "") // remove inline reference markers [17], [ 17 ], [1,2]
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "") // soft hyphens, zero-width chars
    .replace(/-\s+/g, "") // rejoin hyphenated words across lines
    .replace(/\s+/g, " ") // re-collapse after removals
    .trim()
    .toLowerCase();
}

/**
 * Light normalization for individual spans — doesn't remove brackets
 * (since bracket chars may be split across spans).
 */
function normalizeSpan(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "")
    .trim();
}

/**
 * Given a citation's source text and the text layer spans on a page,
 * find which spans contain the matching text.
 * Returns the indices of matching spans, or null if no match found.
 */
export function findCitationInTextLayer(
  citationText: string,
  textLayerSpans: HTMLElement[]
): { startSpan: number; endSpan: number } | null {
  if (!citationText || textLayerSpans.length === 0) return null;

  const normalizedCitation = normalizeText(citationText);
  if (!normalizedCitation) return null;

  // Step 1: Build raw concatenated text with per-character span tracking
  // Each character in rawConcat maps to a span index
  const charToSpan: number[] = [];
  let rawConcat = "";

  for (let i = 0; i < textLayerSpans.length; i++) {
    const spanText = normalizeSpan(textLayerSpans[i].textContent || "");
    if (!spanText) continue;

    if (rawConcat.length > 0) {
      rawConcat += " ";
      charToSpan.push(i); // space belongs to the next span
    }
    for (let c = 0; c < spanText.length; c++) {
      rawConcat += spanText[c];
      charToSpan.push(i);
    }
  }

  // Step 2: Normalize the full concatenated text and build position map
  // posMap[cleanIndex] = rawIndex
  const posMap: number[] = [];
  let cleaned = "";

  // Apply the same normalization steps to the full text, tracking positions
  // First pass: apply all replacements, tracking which raw chars survive
  const raw = rawConcat;
  const lowerRaw = raw.toLowerCase();

  // We need to match the normalizeText logic but track positions.
  // Simplest: iterate through raw chars, decide which to keep.
  // Apply bracket removal by finding bracket ranges first.
  const bracketRanges: [number, number][] = [];
  const bracketRegex = /\[[\s\d,;\-–]*\]/g;
  let bMatch;
  while ((bMatch = bracketRegex.exec(raw)) !== null) {
    bracketRanges.push([bMatch.index, bMatch.index + bMatch[0].length]);
  }

  function isInBracket(pos: number): boolean {
    for (const [start, end] of bracketRanges) {
      if (pos >= start && pos < end) return true;
    }
    return false;
  }

  // Also find hyphen-space ranges to remove (hyphenated words across lines)
  const hyphenRanges: [number, number][] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    if (raw[i] === "-" && /\s/.test(raw[i + 1])) {
      let end = i + 1;
      while (end < raw.length && /\s/.test(raw[end])) end++;
      hyphenRanges.push([i, end]);
    }
  }

  function isInHyphen(pos: number): boolean {
    for (const [start, end] of hyphenRanges) {
      if (pos >= start && pos < end) return true;
    }
    return false;
  }

  let lastWasSpace = false;
  for (let i = 0; i < raw.length; i++) {
    // Skip chars inside bracket references
    if (isInBracket(i)) continue;
    // Skip hyphen-space sequences
    if (isInHyphen(i)) continue;
    // Skip zero-width and soft hyphens
    if (/[\u00AD\u200B\u200C\u200D\uFEFF]/.test(raw[i])) continue;

    const ch = lowerRaw[i];
    const isSpace = /\s/.test(ch);

    if (isSpace) {
      if (!lastWasSpace && cleaned.length > 0) {
        cleaned += " ";
        posMap.push(i);
        lastWasSpace = true;
      }
    } else {
      // Smart quote normalization
      let finalCh = ch;
      if (/["\u201C\u201D]/.test(raw[i])) finalCh = '"';
      else if (/['\u2018\u2019]/.test(raw[i])) finalCh = "'";
      else finalCh = ch;

      cleaned += finalCh;
      posMap.push(i);
      lastWasSpace = false;
    }
  }
  cleaned = cleaned.trim();
  // Adjust posMap if we trimmed leading spaces
  const leadingTrimmed = cleaned.length < posMap.length ? posMap.length - cleaned.length : 0;

  // Step 3: Find the citation in the cleaned text
  let matchStart = -1;
  let matchLen = 0;

  const fullMatch = cleaned.indexOf(normalizedCitation);
  if (fullMatch !== -1) {
    matchStart = fullMatch;
    matchLen = normalizedCitation.length;
  } else {
    // Try 60% prefix
    const shortCitation = normalizedCitation.slice(
      0,
      Math.floor(normalizedCitation.length * 0.6)
    );
    if (shortCitation.length >= 20) {
      const shortMatch = cleaned.indexOf(shortCitation);
      if (shortMatch !== -1) {
        matchStart = shortMatch;
        matchLen = shortCitation.length;
      }
    }
  }

  if (matchStart === -1) return null;

  // Step 4: Map cleaned positions back to raw positions, then to span indices
  const rawStart = posMap[matchStart + leadingTrimmed] ?? 0;
  const rawEnd = posMap[matchStart + matchLen - 1 + leadingTrimmed] ?? rawConcat.length - 1;

  const startSpan = charToSpan[rawStart] ?? 0;
  const endSpan = charToSpan[rawEnd] ?? charToSpan[charToSpan.length - 1];

  if (startSpan === undefined) return null;
  return { startSpan, endSpan };
}

/**
 * Search all pages for a citation match.
 * Returns the 1-based page number, or null.
 */
export function findCitationPage(
  citationText: string,
  pageTextContents: string[]
): number | null {
  const normalized = normalizeText(citationText);
  if (!normalized) return null;

  for (let i = 0; i < pageTextContents.length; i++) {
    const pageText = normalizeText(pageTextContents[i]);
    if (pageText.includes(normalized)) {
      return i + 1; // 1-based page number
    }
    // Try partial match
    const shortText = normalized.slice(
      0,
      Math.floor(normalized.length * 0.6)
    );
    if (shortText.length >= 20 && pageText.includes(shortText)) {
      return i + 1;
    }
  }
  return null;
}
