export type JsonParseCandidateResult =
  | { ok: true; value: unknown }
  | { ok: false };

type UnknownRecord = Record<string, unknown>;

export function extractJsonObjectText(raw: string): string | null {
  return extractJsonObjectTexts(raw)[0] ?? null;
}

export function buildJsonParseCandidates(raw: string): string[] {
  const candidates = [raw.trim(), stripMarkdownJsonFence(raw).trim(), ...extractJsonObjectTexts(raw)]
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

export function collectDictationScriptValueCandidates(value: unknown, depth = 0): unknown[] {
  const candidates: unknown[] = [value];
  if (depth >= 4) return candidates;

  if (typeof value === 'string') {
    const parsed = tryParseJsonCandidate(value);
    if (parsed.ok && parsed.value !== value) {
      candidates.push(...collectDictationScriptValueCandidates(parsed.value, depth + 1));
    }
    return candidates;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      candidates.push(...collectDictationScriptValueCandidates(item, depth + 1));
    }
    return candidates;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as UnknownRecord)) {
      candidates.push(...collectDictationScriptValueCandidates(item, depth + 1));
    }
  }

  return candidates;
}

export function tryParseJsonObjectCandidate(value: string): JsonParseCandidateResult {
  return tryParseJsonCandidate(value);
}

function extractJsonObjectTexts(raw: string): string[] {
  const text = stripMarkdownJsonFence(raw).trim();
  if (!text) return [];

  const candidates: string[] = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    const candidate = extractBalancedObjectAt(text, start);
    if (candidate && isJsonObjectText(candidate)) candidates.push(candidate);
  }

  return [...new Set(candidates)];
}

function extractBalancedObjectAt(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

function isJsonObjectText(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function stripMarkdownJsonFence(raw: string): string {
  const text = raw.trim();
  const fenced = text.match(/^```\s*(?:json|jsonc)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? text;
}

function tryParseJsonCandidate(value: string, depth = 0): JsonParseCandidateResult {
  const text = value.replace(/^\uFEFF/, '').trim();
  const candidates = [...new Set([text, removeTrailingJsonCommas(text)].filter(Boolean))];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (depth < 1 && typeof parsed === 'string') {
        const nested = tryParseJsonCandidate(parsed, depth + 1);
        if (nested.ok) return nested;
      }
      return { ok: true, value: parsed };
    } catch {
      // Try the next repaired candidate. Some free models emit prose, fences, or trailing commas.
    }
  }
  return { ok: false };
}

function removeTrailingJsonCommas(value: string): string {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === ',') {
      let nextIndex = index + 1;
      while (nextIndex < value.length && /\s/.test(value[nextIndex])) nextIndex += 1;
      if (value[nextIndex] === '}' || value[nextIndex] === ']') continue;
    }
    output += char;
  }
  return output;
}
