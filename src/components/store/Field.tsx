import type { ReactNode } from 'react';

/** Label + control + error wrapper. */
export function Field({ id, label, error, hint, required, children, className = '' }: { id: string; label: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{required ? <span className="text-mauve"> *</span> : null}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-taupe">{hint}</p> : null}
      {error ? <p className="field-error" id={`${id}-err`} role="alert">{error}</p> : null}
    </div>
  );
}
