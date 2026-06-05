export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}
