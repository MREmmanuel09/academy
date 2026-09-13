import { auth } from '@/auth';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ImportForm } from './import-form';

interface ImportPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * /settings/import — bring data from RedLab v6 or Sprint L2.
 *
 * The page is a thin server component that gates on auth and hands
 * the form to a client component for upload + result rendering.
 */
export default async function ImportPage({ params }: ImportPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/settings/import');
  }
  const t = await getTranslations('import');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="space-y-4 rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-lg font-semibold">{t('howTitle')}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
        <p className="text-muted-foreground">{t('caveat')}</p>
      </section>

      <div className="mt-6">
        <ImportForm
          labels={{
            dropzone: t('dropzone'),
            fileChosen: t('fileChosen'),
            pickAnother: t('pickAnother'),
            submit: t('submit'),
            submitting: t('submitting'),
            successTitle: t('successTitle'),
            failureTitle: t('failureTitle'),
            imported: t('imported'),
            skipped: t('skipped'),
            warnings: t('warnings'),
            retry: t('retry'),
            backToSettings: t('backToSettings'),
            source: t('source'),
            sourceRedlab: t('sourceRedlab'),
            sourceSprintL2: t('sourceSprintL2'),
            sourceAcademy: t('sourceAcademy'),
            sourceUnknown: t('sourceUnknown'),
            lessons: t('lessons'),
            labs: t('labs'),
            quizAttempts: t('quizAttempts'),
            srsCards: t('srsCards'),
            achievements: t('achievements'),
            activityEvents: t('activityEvents'),
            passwordNote: t('passwordNote'),
            invalidJson: t('invalidJson'),
            tooLarge: t('tooLarge'),
            noFile: t('noFile'),
            emptyFile: t('emptyFile'),
            unauthenticated: t('unauthenticated'),
            unknownError: t('unknownError'),
            maxSize: t('maxSize'),
          }}
        />
      </div>
    </div>
  );
}
