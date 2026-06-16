import type { ReactNode } from 'react';

type AdaptiveBenchmarkExportButtonProps = {
  children: ReactNode;
  compact?: boolean;
  recommended?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
};

export function AdaptiveBenchmarkExportButton({
  children,
  compact = false,
  recommended = false,
  disabled = false,
  title,
  onClick,
}: AdaptiveBenchmarkExportButtonProps) {
  return (
    <button
      type="button"
      className={[
        'secondary-button',
        compact ? 'compact-button' : '',
        recommended ? 'adaptive-recommended-action' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
