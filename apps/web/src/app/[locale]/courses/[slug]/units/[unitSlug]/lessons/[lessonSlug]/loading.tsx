import { Skeleton } from '@academy/ui';

/** Loading state for the lesson viewer: header + article body. */
export default function LessonLoading() {
  return (
    <div
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading lesson"
    >
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-10 w-4/5" />
      <Skeleton className="mt-3 h-5 w-28" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
