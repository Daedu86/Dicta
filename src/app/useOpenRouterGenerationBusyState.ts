import { useState } from 'react';

export function useOpenRouterGenerationBusyState() {
  const [adaptiveOpenRouterBusy, setAdaptiveOpenRouterBusy] = useState(false);
  const [topicOpenRouterBusy, setTopicOpenRouterBusy] = useState(false);

  return {
    adaptiveOpenRouterBusy,
    setAdaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    setTopicOpenRouterBusy,
  };
}
