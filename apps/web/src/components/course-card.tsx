'use client';

import { Link } from '@/components/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@academy/ui';
import { useTranslations } from 'next-intl';

export interface CourseCardProps {
  slug: string;
  title: string;
  description: string;
  track: 'devops' | 'data' | 'english' | 'networking' | 'cloud';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  lessonCount: number;
  completedCount: number;
}

const TRACK_ICON: Record<CourseCardProps['track'], string> = {
  devops: '⚙️',
  data: '📊',
  english: '🌐',
  networking: '🔗',
  cloud: '☁️',
};

const TRACK_LABEL_KEY: Record<CourseCardProps['track'], string> = {
  devops: 'trackDevops',
  data: 'trackData',
  english: 'trackEnglish',
  networking: 'trackNetworking',
  cloud: 'trackCloud',
};

/**
 * Course tile shown on the home grid and the courses list. Stateless
 * server component (no client hooks beyond i18n) so it can be
 * rendered inside a server-rendered list.
 */
export function CourseCard({
  slug,
  title,
  description,
  track,
  difficulty,
  estimatedHours,
  lessonCount,
  completedCount,
}: CourseCardProps) {
  const t = useTranslations('courseBrowser');
  const progress = lessonCount > 0 ? completedCount / lessonCount : 0;
  const progressPct = Math.round(progress * 100);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden="true" className="text-2xl">
            {TRACK_ICON[track]}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {t(TRACK_LABEL_KEY[track])}
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t(difficulty)}
          </span>
        </div>
        <CardTitle>
          <Link href={`/courses/${slug}`} className="hover:underline">
            {title}
          </Link>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t('estimatedHours')}: <span className="font-medium">{estimatedHours}h</span>
          </span>
          <span>
            {completedCount}/{lessonCount} {t('lessons')}
          </span>
        </div>
        <ProgressBar
          value={progressPct}
          label={`${t('lessons')}: ${completedCount}/${lessonCount}`}
        />
        <Link
          href={`/courses/${slug}`}
          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {progress > 0 ? t('continueCourse') : t('startCourse')} →
        </Link>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: decorative visual fill
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
