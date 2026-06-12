import { promises as fs } from 'node:fs';

type LocalDevApiKeyName = 'OPENROUTER_API_KEY';

const readEnvLocal = async (envLocalPath: string): Promise<string> => {
  try {
    return await fs.readFile(envLocalPath, 'utf-8');
  } catch {
    return '';
  }
};

const parseEnvValue = (rawValue: string): string => {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return typeof parsed === 'string' ? parsed : '';
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const readApiKey = async (envLocalPath: string, keyName: LocalDevApiKeyName): Promise<string> => {
  const fromProcess = process.env[keyName]?.trim();
  if (fromProcess) return fromProcess;

  const envText = await readEnvLocal(envLocalPath);
  const line = envText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .find((row) => row.startsWith(`${keyName}=`));
  if (!line) return '';
  return parseEnvValue(line.slice(`${keyName}=`.length)).trim();
};

const upsertApiKey = async (envLocalPath: string, keyName: LocalDevApiKeyName, apiKey: string): Promise<void> => {
  const nextLine = `${keyName}=${JSON.stringify(apiKey)}`;
  const envText = await readEnvLocal(envLocalPath);
  const lines = envText ? envText.split(/\r?\n/) : [];
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (line.trim().startsWith(`${keyName}=`)) {
      replaced = true;
      return nextLine;
    }
    return line;
  });
  if (!replaced) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() !== '') {
      nextLines.push('');
    }
    nextLines.push(nextLine);
  }
  await fs.writeFile(envLocalPath, `${nextLines.join('\n')}\n`, 'utf-8');
};

const removeApiKey = async (envLocalPath: string, keyName: LocalDevApiKeyName): Promise<boolean> => {
  const envText = await readEnvLocal(envLocalPath);
  if (!envText) return false;
  const lines = envText.split(/\r?\n/);
  const nextLines = lines.filter((line) => !line.trim().startsWith(`${keyName}=`));
  if (nextLines.length === lines.length) return false;
  await fs.writeFile(envLocalPath, `${nextLines.join('\n')}\n`, 'utf-8');
  return true;
};

export function createLocalDevEnvStore(envLocalPath: string) {
  return {
    getOpenRouterApiKey: () => readApiKey(envLocalPath, 'OPENROUTER_API_KEY'),
    upsertOpenRouterApiKey: (apiKey: string) => upsertApiKey(envLocalPath, 'OPENROUTER_API_KEY', apiKey),
    removeOpenRouterApiKey: () => removeApiKey(envLocalPath, 'OPENROUTER_API_KEY'),
  };
}
