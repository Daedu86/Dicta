import {
  formatCreatedDeviceIcon,
  formatCreatedDeviceTooltip,
} from '../../core/sessionDevice';
import type { StoredSession } from '../../app/sessionTypes';

export function SessionDeviceIcon({ session }: { session: StoredSession }) {
  const icon = formatCreatedDeviceIcon(session.createdDeviceKind);
  if (!icon) return null;
  return (
    <span
      className="session-device-icon"
      title={formatCreatedDeviceTooltip(session.createdDeviceKind, session.createdDeviceLabel)}
      aria-label={formatCreatedDeviceTooltip(session.createdDeviceKind, session.createdDeviceLabel)}
    >
      {icon}
    </span>
  );
}
