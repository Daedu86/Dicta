type VersionPromptProps = {
  compact?: boolean;
  className?: string;
  onActivate: () => void;
};

export function Foo({ compact = false, className = '', onActivate }: VersionPromptProps) {
  const classes = ['app-update-banner', compact ? 'app-update-banner-compact' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      <span className="app-update-banner-text">
        {compact ? 'Nueva version disponible.' : 'Hay una nueva version de Dicta disponible.'}
      </span>
      <button type="button" className="app-update-banner-button" onClick={onActivate}>
        Actualizar
      </button>
    </div>
  );
}
