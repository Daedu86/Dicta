import { useEffect } from 'react';
import { installInpAttributionObserver } from './inpAttribution';

export function InpAttributionObserver() {
  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') {
      return undefined;
    }

    return installInpAttributionObserver();
  }, []);

  return null;
}
