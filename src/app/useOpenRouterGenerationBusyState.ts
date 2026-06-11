import { useState } from 'react';

export function useOpenRouterGenerationBusyState() {
  const [directOpenRouterBusy, setDirectOpenRouterBusy] = useState(false);
  const [directIntermediateOpenRouterBusy, setDirectIntermediateOpenRouterBusy] = useState(false);
  const [directAdvancedOpenRouterBusy, setDirectAdvancedOpenRouterBusy] = useState(false);
  const [expressEasyOpenRouterBusy, setExpressEasyOpenRouterBusy] = useState(false);
  const [expressIntermediateOpenRouterBusy, setExpressIntermediateOpenRouterBusy] = useState(false);
  const [expressAdvancedOpenRouterBusy, setExpressAdvancedOpenRouterBusy] = useState(false);

  return {
    directOpenRouterBusy,
    setDirectOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    setDirectIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    setDirectAdvancedOpenRouterBusy,
    expressEasyOpenRouterBusy,
    setExpressEasyOpenRouterBusy,
    expressIntermediateOpenRouterBusy,
    setExpressIntermediateOpenRouterBusy,
    expressAdvancedOpenRouterBusy,
    setExpressAdvancedOpenRouterBusy,
  };
}
