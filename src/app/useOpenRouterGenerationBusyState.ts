import { useState } from 'react';

export function useOpenRouterGenerationBusyState() {
  const [directOpenRouterBusy, setDirectOpenRouterBusy] = useState(false);

  return {
    directOpenRouterBusy,
    setDirectOpenRouterBusy,
  };
}
