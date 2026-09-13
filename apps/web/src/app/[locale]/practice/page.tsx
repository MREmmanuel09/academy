import { Link } from '@/components/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface PracticeIndexProps {
  params: Promise<{ locale: string }>;
}

/**
 * Practice hub landing page.
 *
 * The `practice/layout.tsx` provides the tab nav across all practice modes;
 * this page renders the welcome copy and a tile-per-mode grid so the route
 * resolves to a real, useful page (and so screen readers and search engines
 * see a heading + content here).
 */
export default async function PracticeIndexPage({ params }: PracticeIndexProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('practice');

  const modes = [
    {
      href: '/practice/srs',
      titleKey: 'tabSrs' as const,
      hint: 'Review cards due today with FSRS-6 spaced repetition.',
    },
    {
      href: '/practice/quiz',
      titleKey: 'tabQuiz' as const,
      hint: 'Adaptive 2PL IRT quiz that adjusts to your ability.',
    },
    {
      href: '/practice/vocabulary',
      titleKey: 'tabVocab' as const,
      hint: 'Drill vocabulary with quick flip cards.',
    },
    {
      href: '/practice/games',
      titleKey: 'tabGames' as const,
      hint: 'Mini-games to lock in what you have learned.',
    },
    {
      href: '/practice/roleplay',
      titleKey: 'tabRoleplay' as const,
      hint: 'AI-powered roleplay scenarios to practice real conversations.',
    },
  ];

  return (
    <section aria-labelledby="practice-index-heading" className="space-y-6">
      <header>
        <h2 id="practice-index-heading" className="text-xl font-semibold tracking-tight">
          {t('indexHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('indexLead')}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => (
          <li key={mode.href}>
            <Link
              href={mode.href}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="block text-base font-semibold text-foreground">
                {t(mode.titleKey)}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{mode.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
