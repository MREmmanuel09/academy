import { auth } from '@/auth';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './onboarding-form';

interface OnboardingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const tz =
    typeof Intl !== 'undefined' && 'DateTimeFormat' in Intl
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';

  const t = await getTranslations('onboarding');

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>
        <OnboardingForm
          defaultLocale={session.user.preferredLocale}
          defaultTimezone={session.user.timezone || tz}
        />
      </div>
    </div>
  );
}
