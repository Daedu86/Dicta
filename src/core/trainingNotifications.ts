import type { DictationScript, DictationScriptDifficulty } from './adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from './openRouterJobs';

export const TRAINING_NOTIFICATION_URL = '/training';
const TRAINING_NOTIFICATION_ICON = '/pwa-icon-192.png';
const TRAINING_NOTIFICATION_BADGE = '/pwa-icon-192.png';

export type TrainingSessionNotificationPayload = {
  title: string;
  options: NotificationOptions;
};

export type TrainingNotificationPermissionState = NotificationPermission | 'unsupported';

export function buildGeneratedTrainingSessionNotification(
  script: DictationScript,
  job: ActiveOpenRouterJob,
): TrainingSessionNotificationPayload {
  const durationLabel = job.durationMinutes === 1 ? 'Express' : 'Standard';
  const difficultyLabel = formatNotificationDifficulty(script.difficulty);
  const languageLabel = script.language.toUpperCase();
  const sessionTitle = script.title.trim() || 'New session';
  return {
    title: 'Dicta session ready',
    options: {
      body: `${durationLabel} ${difficultyLabel} ${languageLabel}: ${sessionTitle}. Tap to open Training Mode.`,
      icon: TRAINING_NOTIFICATION_ICON,
      badge: TRAINING_NOTIFICATION_BADGE,
      tag: `dicta-session-ready-${job.jobId}`,
      data: {
        url: TRAINING_NOTIFICATION_URL,
        jobId: job.jobId,
        slotLabel: job.slotLabel,
      },
    },
  };
}

export async function requestTrainingNotificationPermission(): Promise<TrainingNotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showGeneratedTrainingSessionNotification(payload: TrainingSessionNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const registration = await getServiceWorkerRegistrationForNotification();
  if (registration && typeof registration.showNotification === 'function') {
    await registration.showNotification(payload.title, payload.options);
    return true;
  }

  try {
    const notification = new Notification(payload.title, payload.options);
    notification.onclick = () => {
      notification.close();
      window.focus();
      window.location.assign(TRAINING_NOTIFICATION_URL);
    };
    return true;
  } catch {
    return false;
  }
}

async function getServiceWorkerRegistrationForNotification(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing?.active) return existing;
  } catch {
    return null;
  }

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1500)),
    ]);
  } catch {
    return null;
  }
}

function formatNotificationDifficulty(difficulty: DictationScriptDifficulty): string {
  if (difficulty === 'easy') return 'Precision';
  if (difficulty === 'hard') return 'Challenge';
  return 'Stabilize';
}
