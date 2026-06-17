import { useEffect } from 'react';

type SpeedInsightsMetric = {
  url?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    si?: (...params: unknown[]) => void;
    siq?: unknown[];
  }
}

const SPEED_INSIGHTS_SCRIPT_SRC = '/_vercel/speed-insights/script.js';
const SPEED_INSIGHTS_SAMPLE_RATE = '0.25';
const SPEED_INSIGHTS_SDK_NAME = '@vercel/speed-insights/react';
const SPEED_INSIGHTS_SDK_VERSION = '2.0.0';

function shouldSendSpeedInsight(metric: SpeedInsightsMetric) {
  if (!metric.url) {
    return metric;
  }

  const path = new URL(metric.url, window.location.href).pathname;

  if (path.startsWith('/admin') || path.startsWith('/internal')) {
    return null;
  }

  return metric;
}

function queueSpeedInsightsCommand(...params: unknown[]) {
  window.siq = window.siq ?? [];
  window.siq.push(params);
}

export function VercelSpeedInsights() {
  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') {
      return;
    }

    window.si = window.si ?? queueSpeedInsightsCommand;
    window.si('beforeSend', shouldSendSpeedInsight);

    if (document.head.querySelector(`script[src="${SPEED_INSIGHTS_SCRIPT_SRC}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = SPEED_INSIGHTS_SCRIPT_SRC;
    script.defer = true;
    script.dataset.sdkn = SPEED_INSIGHTS_SDK_NAME;
    script.dataset.sdkv = SPEED_INSIGHTS_SDK_VERSION;
    script.dataset.sampleRate = SPEED_INSIGHTS_SAMPLE_RATE;
    script.dataset.dictaSpeedInsights = 'true';
    script.onerror = () => {
      console.warn(
        `[Vercel Speed Insights] Failed to load ${SPEED_INSIGHTS_SCRIPT_SRC}. Check deployment settings or content blockers.`,
      );
    };

    document.head.appendChild(script);
  }, []);

  return null;
}
