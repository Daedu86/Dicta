import { useEffect } from 'react';

type SpeedInsightsMetric = {
  url?: string;
  route?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    si?: (...params: unknown[]) => void;
    siq?: unknown[];
    __dictaSpeedInsightsRoute?: string;
  }
}

const SPEED_INSIGHTS_SCRIPT_SRC = '/_vercel/speed-insights/script.js';
const SPEED_INSIGHTS_SCRIPT_SELECTOR = `script[data-dicta-speed-insights="true"], script[src="${SPEED_INSIGHTS_SCRIPT_SRC}"]`;
const SPEED_INSIGHTS_SAMPLE_RATE = '0.25';
const SPEED_INSIGHTS_SDK_NAME = '@vercel/speed-insights/react';
const SPEED_INSIGHTS_SDK_VERSION = '2.0.0';

function normalizeSpeedInsightsRoute(route: string) {
  const trimmedRoute = route.trim();
  if (!trimmedRoute) {
    return '/';
  }

  return trimmedRoute.startsWith('/') ? trimmedRoute : `/${trimmedRoute}`;
}

function getCurrentSpeedInsightsRoute() {
  return window.__dictaSpeedInsightsRoute ?? normalizeSpeedInsightsRoute(window.location.pathname);
}

function applySpeedInsightsRoute(script: HTMLScriptElement) {
  script.dataset.route = getCurrentSpeedInsightsRoute();
}

function shouldSendSpeedInsight(metric: SpeedInsightsMetric) {
  if (!metric.url) {
    return metric;
  }

  const path = new URL(metric.url, window.location.href).pathname;
  const route = typeof metric.route === 'string' ? metric.route : undefined;

  if (
    path.startsWith('/admin') ||
    path.startsWith('/internal') ||
    route?.startsWith('/admin') ||
    route?.startsWith('/internal')
  ) {
    return null;
  }

  return metric;
}

function setVercelSpeedInsightsRoute(route: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.__dictaSpeedInsightsRoute = normalizeSpeedInsightsRoute(route);

  const script = document.head.querySelector<HTMLScriptElement>(SPEED_INSIGHTS_SCRIPT_SELECTOR);
  if (script) {
    applySpeedInsightsRoute(script);
  }
}

function queueSpeedInsightsCommand(...params: unknown[]) {
  window.siq = window.siq ?? [];
  window.siq.push(params);
}

export function VercelSpeedInsightsRouteSync({ route }: { route: string }) {
  useEffect(() => {
    setVercelSpeedInsightsRoute(route);
  }, [route]);

  return null;
}

export function VercelSpeedInsights() {
  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') {
      return;
    }

    window.si = window.si ?? queueSpeedInsightsCommand;
    window.si('beforeSend', shouldSendSpeedInsight);

    const existingScript = document.head.querySelector<HTMLScriptElement>(SPEED_INSIGHTS_SCRIPT_SELECTOR);
    if (existingScript) {
      applySpeedInsightsRoute(existingScript);
      return;
    }

    const script = document.createElement('script');
    script.src = SPEED_INSIGHTS_SCRIPT_SRC;
    script.defer = true;
    script.dataset.sdkn = SPEED_INSIGHTS_SDK_NAME;
    script.dataset.sdkv = SPEED_INSIGHTS_SDK_VERSION;
    script.dataset.sampleRate = SPEED_INSIGHTS_SAMPLE_RATE;
    script.dataset.dictaSpeedInsights = 'true';
    applySpeedInsightsRoute(script);
    script.onerror = () => {
      console.warn(
        `[Vercel Speed Insights] Failed to load ${SPEED_INSIGHTS_SCRIPT_SRC}. Check deployment settings or content blockers.`,
      );
    };

    document.head.appendChild(script);
  }, []);

  return null;
}
