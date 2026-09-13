import * as React from 'react';
import { cn } from '../lib/cn.js';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short title, e.g. "Nothing here yet". */
  title: string;
  /** One-line explanation shown below the title. */
  description?: string;
  /** Decorative icon rendered above the title (aria-hidden handled by caller). */
  icon?: React.ReactNode;
  /** Primary call-to-action rendered below the description. */
  action?: React.ReactNode;
}

/**
 * Centered empty-state block for lists, dashboards and feeds with no
 * data yet. Keeps tone, spacing and hierarchy identical everywhere
 * instead of ad-hoc "no results" paragraphs.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, icon, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
