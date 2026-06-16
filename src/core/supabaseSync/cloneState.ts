export function cloneNestedRecord(input: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, { ...value }]));
}

export function cloneFeedbackRecord(input: Record<string, Record<string, unknown[]>>): Record<string, Record<string, unknown[]>> {
  return Object.fromEntries(
    Object.entries(input).map(([inputMode, byLanguage]) => [
      inputMode,
      Object.fromEntries(Object.entries(byLanguage).map(([language, list]) => [language, [...list]])),
    ]),
  );
}
