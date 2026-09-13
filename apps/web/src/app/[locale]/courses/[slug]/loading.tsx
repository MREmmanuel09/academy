import { Skeleton } from '@academy/ui';

/** Loading state for the course detail: header + unit list. */
export default function CourseDetailLoading() {
  return (
    <div
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading course"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-10 w-3/4" />
      <Skeleton className="mt-2 h-4 w-full" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
          <div key={i} className="space-y-2 rounded-lg border p-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
