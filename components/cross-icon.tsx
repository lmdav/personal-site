type CrossIconProps = {
  className?: string;
  size?: number;
};

/**
 * The aaru-style cross mark: four short lines forming a ++ shape
 * with a hollow center. Pure CSS-friendly SVG.
 */
export function CrossIcon({ className, size = 16 }: CrossIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <line x1="8" y1="1" x2="8" y2="6" />
      <line x1="8" y1="10" x2="8" y2="15" />
      <line x1="1" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="15" y2="8" />
    </svg>
  );
}
