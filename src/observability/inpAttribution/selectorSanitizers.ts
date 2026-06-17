export function cleanToken(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
}

export function cleanAttribute(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_.:/-]/g, '-').slice(0, 48);
}
