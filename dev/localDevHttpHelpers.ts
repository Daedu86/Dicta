export type LocalDevHttpError = Error & { statusCode: number };

type LocalDevResponseLike = {
  statusCode: number;
  end: (body?: string) => void;
};

export const createLocalDevHttpError = (message: string, statusCode: number): LocalDevHttpError =>
  Object.assign(new Error(message), { statusCode });

export const sendLocalDevError = (
  res: LocalDevResponseLike,
  error: unknown,
  fallback: string,
): void => {
  const statusCode = Number((error as { statusCode?: unknown } | null)?.statusCode);
  res.statusCode = Number.isFinite(statusCode) ? statusCode : 500;
  res.end(error instanceof Error ? error.message : fallback);
};

export const readLocalDevRequestBody = async (
  req: NodeJS.ReadableStream,
  maxBytes: number,
): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      bytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
      if (bytes > maxBytes) {
        settle(() => reject(createLocalDevHttpError(`Request body too large. Limit is ${maxBytes} bytes.`, 413)));
        return;
      }
      data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    });
    req.on('end', () => settle(() => resolve(data)));
    req.on('error', (error) => settle(() => reject(error)));
  });

export const readLocalDevJsonRequestBody = async <T>(
  req: NodeJS.ReadableStream,
  maxBytes: number,
): Promise<T> => {
  const body = await readLocalDevRequestBody(req, maxBytes);
  try {
    return JSON.parse(body) as T;
  } catch {
    throw createLocalDevHttpError('Invalid JSON request body.', 400);
  }
};

export const maskLocalDevApiKeySuffix = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const suffixLength = 4;
  const suffix = trimmed.length > suffixLength ? trimmed.slice(-suffixLength) : trimmed;
  return `…${suffix}`;
};
