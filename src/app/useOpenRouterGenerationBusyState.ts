import { useState } from 'react';

export function useOpenRouterGenerationBusyState() {
  const [directOpenRouterBusy, setDirectOpenRouterBusy] = useState(false);
  const [directIntermediateOpenRouterBusy, setDirectIntermediateOpenRouterBusy] = useState(false);
  const [directAdvancedOpenRouterBusy, setDirectAdvancedOpenRouterBusy] = useState(false);

  return {
    directOpenRouterBusy,
    setDirectOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    setDirectIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    setDirectAdvancedOpenRouterBusy,
  };
}
