/**
 * Reusable progress bar.
 *
 * Stateless server component. Use it for course progress, unit
 * progress, or anything that has a 0..100 percentage.
 */
import { cn } from '@academy/ui';

export interface ProgressBarProps {
  /** 0..100. Values outside the range are clamped. */
  value: number;
  /** Show the value as a label inside the bar. */
  showLabel?: boolean;
  className?: string;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
}

export function ProgressBar({ value, showLabel = false, className, ariaLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: decorative progress fill
    <div
      role="progressbar"
      // Default label so screen readers always have something to read.
      // Callers should pass a more specific `ariaLabel` when context allows.
      aria-label={ariaLabel ?? 'Progress'}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className="flex h-full items-center justify-end bg-primary px-2 text-[10px] font-medium text-primary-foreground transition-all"
        style={{ width: `${clamped}%` }}
      >
        {showLabel && clamped > 12 ? `${clamped}%` : null}
      </div>
    </div>
  );
}
