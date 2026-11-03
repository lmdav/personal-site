/**
 * Right-pointing arrow used beside link labels. Rotate it with a class
 * (for example `rotate-90`) for other directions.
 */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <line x1="2" y1="7" x2="12" y2="7" />
      <polyline points="8,3 12,7 8,11" />
    </svg>
  );
}
