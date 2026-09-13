import { Skeleton } from '@academy/ui';

/** Loading state for the dashboard: stat cards + progress rows. */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="mt-8 h-64" />
    </div>
  );
}
