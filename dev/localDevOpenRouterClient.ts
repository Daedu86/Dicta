export type LocalDevOpenRouterChatCompletionRequest = {
  apiKey: string;
  origin?: string;
  model: string;
  prompt: string;
  maxTokens: number;
};

export async function fetchLocalDevOpenRouterChatCompletion({
  apiKey,
  origin,
  model,
  prompt,
  maxTokens,
}: LocalDevOpenRouterChatCompletionRequest): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': origin ?? 'http://localhost:5173',
      'X-Title': 'Dicta MVP (local)',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
}
