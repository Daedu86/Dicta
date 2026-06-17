export function tokenizeListeningText(text: string | null | undefined): string[] {
  return (text ?? '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function isFunctionWord(token: string, functionWords: Set<string>): boolean {
  return functionWords.has(token);
}

export function isContentWord(token: string, functionWords: Set<string>): boolean {
  return !isFunctionWord(token, functionWords) && !isNumericToken(token);
}

export function isDetailToken(token: string, functionWords: Set<string>): boolean {
  return isFunctionWord(token, functionWords) || isNumericToken(token) || token.length <= 3;
}

function isNumericToken(token: string): boolean {
  return /^\p{N}+$/u.test(token);
}
