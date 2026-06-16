function removeTrailingJsonCommas(value) {
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

function parseJsonCandidate(value, depth = 0) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.replace(/^\uFEFF/, '').trim();
  const candidates = [...new Set([text, removeTrailingJsonCommas(text)].filter(Boolean))];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (depth < 1 && typeof parsed === 'string') {
        const nested = parseJsonCandidate(parsed, depth + 1);
        if (nested !== null) return nested;
      }
      return parsed;
    } catch {
      // Try the next repaired candidate.
    }
  }
  return null;
}

export function tryParseOpenRouterJobJson(value) {
  return parseJsonCandidate(value);
}

function stripMarkdownJsonFence(raw) {
  const text = String(raw ?? '').trim();
  const fenced = text.match(/^```\s*(?:json|jsonc)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? text;
}

function collectJsonObjectCandidates(raw) {
  const text = stripMarkdownJsonFence(raw);
  const candidates = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
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
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return [...new Set([String(raw ?? '').trim(), text.trim(), ...candidates].filter(Boolean))];
}

function isValidSessionScript(value) {
  if (!value || typeof value !== 'object') return false;
  const script = value;
  return (
    typeof script.title === 'string' &&
    typeof script.language === 'string' &&
    typeof script.inputMode === 'string' &&
    Array.isArray(script.phrases) &&
    script.phrases.length > 0 &&
    script.phrases.every((phrase) => phrase && typeof phrase === 'object' && typeof phrase.text === 'string' && phrase.text.trim().length > 0)
  );
}

function findValidSessionScript(value, depth = 0) {
  if (isValidSessionScript(value)) return value;
  if (depth >= 4) return null;

  if (typeof value === 'string') {
    const parsed = tryParseOpenRouterJobJson(value);
    if (parsed !== null && parsed !== value) return findValidSessionScript(parsed, depth + 1);
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValidSessionScript(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findValidSessionScript(item, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export function extractOpenRouterJobSessionJson(raw) {
  for (const candidate of collectJsonObjectCandidates(raw)) {
    const parsed = tryParseOpenRouterJobJson(candidate);
    const script = findValidSessionScript(parsed);
    if (script) return JSON.stringify(script, null, 2);
  }
  return '';
}
