import { useEffect, useState } from 'react';

export function useOpenRouterApiKeyStatus(localDevFeaturesAvailable: boolean) {
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeySuffix, setApiKeySuffix] = useState('');
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [apiKeyBusy, setApiKeyBusy] = useState(false);

  const refreshApiKeyStatus = async (): Promise<void> => {
    if (!localDevFeaturesAvailable) {
      setApiKeyConfigured(false);
      setApiKeySuffix('');
      setApiKeyMessage('Hosted builds read OPENROUTER_API_KEY from Vercel environment variables.');
      return;
    }

    try {
      const response = await fetch('/api/openrouter/key/status');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Status request failed (${response.status}).`);
      }

      const payload = (await response.json()) as { configured?: boolean; suffix?: string };
      setApiKeyConfigured(Boolean(payload.configured));
      setApiKeySuffix(typeof payload.suffix === 'string' ? payload.suffix : '');
    } catch (err) {
      setApiKeyConfigured(false);
      setApiKeySuffix('');
      setApiKeyMessage(err instanceof Error ? err.message : 'Failed to read key status.');
    }
  };

  useEffect(() => {
    void refreshApiKeyStatus();
  }, []);

  return {
    apiKeyDraft,
    setApiKeyDraft,
    apiKeyVisible,
    setApiKeyVisible,
    apiKeyConfigured,
    apiKeySuffix,
    apiKeyMessage,
    setApiKeyMessage,
    apiKeyBusy,
    setApiKeyBusy,
    refreshApiKeyStatus,
  };
}
