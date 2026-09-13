import { Skeleton } from '@academy/ui';

/** Loading state for the practice hub: heading + mode tiles. */
export default function PracticeLoading() {
  return (
    <section aria-busy="true" aria-label="Loading practice" className="space-y-6">
      <header>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
          <li key={i} className="rounded-lg border p-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-4 w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
