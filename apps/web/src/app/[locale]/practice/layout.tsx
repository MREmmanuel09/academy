import { Link } from '@/components/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function PracticeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('practice');

  const tabs = [
    { href: '/practice/srs', label: t('tabSrs') },
    { href: '/practice/quiz', label: t('tabQuiz') },
    { href: '/practice/vocabulary', label: t('tabVocab') },
    { href: '/practice/games', label: t('tabGames') },
    { href: '/practice/roleplay', label: t('tabRoleplay') },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </header>
      <nav aria-label={t('title')} className="mb-6 border-b">
        <ul className="-mb-px flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="inline-block border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
