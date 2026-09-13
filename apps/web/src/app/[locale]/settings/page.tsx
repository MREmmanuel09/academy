import { auth } from '@/auth';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from './settings-form';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('settings');
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/settings');
  }
  const userId = session.user.id;
  const db = getDb() as SqliteDb;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

  const [aiConfig] = await db
    .select()
    .from(schema.userAiConfig)
    .where(eq(schema.userAiConfig.userId, userId))
    .limit(1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </header>
      <SettingsForm
        user={{
          email: user?.email ?? '',
          name: user?.name ?? '',
          preferredLocale: (user?.preferredLocale as 'es' | 'en' | undefined) ?? 'es',
          timezone: user?.timezone ?? 'UTC',
        }}
        aiConfig={{
          hasOpenaiKey: Boolean(aiConfig?.openaiKey),
          hasAnthropicKey: Boolean(aiConfig?.anthropicKey),
          hasOllamaUrl: Boolean(aiConfig?.ollamaBaseUrl),
          ollamaBaseUrl: aiConfig?.ollamaBaseUrl ?? '',
          enabled: aiConfig?.enabled ?? false,
        }}
      />
    </div>
  );
}
