export async function fetchLocalDevOllamaModels(apiKey: string): Promise<Response> {
  return fetch('https://ollama.com/api/tags', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
}

export type LocalDevOllamaChatRequest = {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
};

export async function fetchLocalDevOllamaChat({
  apiKey,
  model,
  prompt,
  maxTokens,
}: LocalDevOllamaChatRequest): Promise<Response> {
  return fetch('https://ollama.com/api/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      options: {
        num_predict: maxTokens,
      },
    }),
  });
}
