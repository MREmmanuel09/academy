'use server';

import { auth } from '@/auth';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ProfileUpdateResult = { ok: true } | { ok: false; error: string };

/**
 * Update the user's profile (name, preferredLocale, timezone).
 * Email is intentionally not editable for MVP.
 */
export async function updateProfileAction(formData: FormData): Promise<ProfileUpdateResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };
  const userId = session.user.id;
  const name = String(formData.get('name') ?? '').trim();
  const preferredLocale = formData.get('preferredLocale') === 'en' ? 'en' : 'es';
  const timezone = String(formData.get('timezone') ?? 'UTC')
    .trim()
    .slice(0, 100);

  if (!name) return { ok: false, error: 'Name is required' };
  if (name.length > 100) return { ok: false, error: 'Name too long' };

  const db = getDb() as SqliteDb;
  await db
    .update(schema.users)
    .set({ name, preferredLocale, timezone })
    .where(eq(schema.users.id, userId));
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}

export type AiConfigResult = { ok: true; enabled: boolean } | { ok: false; error: string };

/**
 * Save AI configuration. Empty strings clear the key. We never return
 * the actual key to the client (it would be visible in network logs
 * if we did); the UI just shows "configured" vs "not configured".
 */
export async function saveAiConfigAction(formData: FormData): Promise<AiConfigResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };
  const userId = session.user.id;

  const openaiKey = String(formData.get('openaiKey') ?? '').trim() || null;
  const anthropicKey = String(formData.get('anthropicKey') ?? '').trim() || null;
  const ollamaBaseUrl = String(formData.get('ollamaBaseUrl') ?? '').trim() || null;
  const enabled = formData.get('enabled') === 'on';

  // If "enabled" is checked, require at least one provider configured.
  if (enabled && !openaiKey && !anthropicKey && !ollamaBaseUrl) {
    return {
      ok: false,
      error:
        'Enable AI features requires at least one provider (OpenAI key, Anthropic key, or Ollama URL).',
    };
  }

  const db = getDb() as SqliteDb;
  const [existing] = await db
    .select()
    .from(schema.userAiConfig)
    .where(eq(schema.userAiConfig.userId, userId))
    .limit(1);
  if (existing) {
    await db
      .update(schema.userAiConfig)
      .set({
        openaiKey,
        anthropicKey,
        ollamaBaseUrl,
        enabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.userAiConfig.userId, userId));
  } else {
    await db.insert(schema.userAiConfig).values({
      userId,
      openaiKey,
      anthropicKey,
      ollamaBaseUrl,
      enabled,
    });
  }
  revalidatePath('/settings');
  return { ok: true, enabled };
}

export type ExportResult =
  | {
      ok: true;
      filename: string;
      contentType: string;
      body: string;
    }
  | { ok: false; error: string };

/**
 * Build a JSON export of the user's data (profile, XP, progress,
 * SRS cards, vocab deck, activity log). The export is portable and
 * matches the format we'd accept from a RedLab v6 JSON import.
 */
export async function exportUserDataAction(): Promise<ExportResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }
  const userId = session.user.id;
  const db = getDb() as SqliteDb;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const [xp] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, userId))
    .limit(1);
  const [streak] = await db
    .select()
    .from(schema.userStreaks)
    .where(eq(schema.userStreaks.userId, userId))
    .limit(1);
  const progress = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId));
  const srsCards = await db
    .select()
    .from(schema.srsCards)
    .where(eq(schema.srsCards.userId, userId));
  const vocabDeck = await db
    .select({
      cardId: schema.srsCards.id,
      vocabId: schema.srsCards.contentId,
    })
    .from(schema.srsCards)
    .where(eq(schema.srsCards.userId, userId));
  const unlocks = await db
    .select()
    .from(schema.userAchievements)
    .where(eq(schema.userAchievements.userId, userId));
  const attempts = await db
    .select()
    .from(schema.userQuizAttempts)
    .where(eq(schema.userQuizAttempts.userId, userId));
  const activity = await db
    .select()
    .from(schema.activityLog)
    .where(eq(schema.activityLog.userId, userId));

  const body = JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            preferredLocale: user.preferredLocale,
            timezone: user.timezone,
            createdAt: user.createdAt,
          }
        : null,
      xp: xp ?? null,
      streak: streak ?? null,
      progress,
      srsCards,
      vocabDeck,
      unlocks,
      quizAttempts: attempts,
      activity,
    },
    null,
    2,
  );

  return {
    ok: true,
    filename: `academy-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`,
    contentType: 'application/json; charset=utf-8',
    body,
  };
}
