'use server';

import { auth } from '@/auth';
import { applyXpBatch } from '@/lib/gamification';
import { type ItemParams, type Response, estimateTheta, selectNextItem } from '@/lib/irt';
import { bktUpdate, topicKey } from '@/lib/mastery';
import { getExamDefinition, getQuestionDetail, getQuestionDetails } from '@/lib/quiz-content';
import { createInitialCard, serializeState } from '@/lib/srs';
import { type SqliteDb, getDb, schema } from '@academy/db';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type QuizStartResult =
  | {
      ok: true;
      quizId: string;
      attemptId: string;
      questionIds: string[];
      title: string;
      passingScore: number;
      /** Time limit in ms (durationMinutes, or 1 min/question fallback). */
      durationMs: number;
      totalQuestions: number;
    }
  | { ok: false; error: string };

/**
 * Start a quiz attempt. Records an open attempt row (score 0,
 * durationMs 0) that `submitQuizAnswerAction` finalises on the last
 * question — the completed rows are what unit-exam gating reads.
 */
export async function startQuizAction(quizId: string): Promise<QuizStartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not signed in' };
  }
  const quiz = await getExamDefinition(quizId);
  if (!quiz) {
    return { ok: false, error: `Quiz ${quizId} not found` };
  }
  const db = getDb() as SqliteDb;
  const [attempt] = await db
    .insert(schema.userQuizAttempts)
    .values({
      userId: session.user.id,
      quizId,
      score: 0,
      correctCount: 0,
      totalCount: quiz.questionIds.length,
      durationMs: 0,
      detail: [],
    })
    .returning({ id: schema.userQuizAttempts.id });
  return {
    ok: true,
    quizId,
    attemptId: attempt?.id ?? '',
    questionIds: quiz.questionIds,
    title: quiz.title,
    passingScore: quiz.passingScore,
    durationMs:
      (quiz.durationMinutes > 0 ? quiz.durationMinutes : quiz.questionIds.length) * 60_000,
    totalQuestions: quiz.questionIds.length,
  };
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: string;
  explanation: string;
  a: number;
  b: number;
  c: number;
}

export type QuizNextResult =
  | { ok: true; question: QuizQuestion | null } // null = quiz is done
  | { ok: false; error: string };

export type QuizMode = 'exam' | 'practice';

export interface QuizNextOptions {
  /** Practice mode stops early once ability is measured precisely. */
  mode?: QuizMode;
}

const PRACTICE_MIN_QUESTIONS = 5;
const PRACTICE_MAX_QUESTIONS = 15;
const PRACTICE_SE_THRESHOLD = 0.35;

/**
 * Pick the next question for the user using Maximum Information
 * Selection (MIS) over calibrated IRT params (DB/JSON), with a
 * deterministic hash fallback when a question has no params.
 *
 * In practice mode the quiz ends early once the standard error of
 * the ability estimate drops below threshold (min/max bounds apply).
 * Certification exams always run the full question list.
 */
export async function nextQuizQuestionAction(
  quizId: string,
  seenIds: readonly string[],
  theta: number,
  responses: readonly {
    questionId: string;
    correct: boolean;
    a: number;
    b: number;
    c: number;
  }[] = [],
  opts?: QuizNextOptions,
): Promise<QuizNextResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };
  const quiz = await getExamDefinition(quizId);
  if (!quiz) return { ok: false, error: `Quiz ${quizId} not found` };

  if (opts?.mode === 'practice' && seenIds.length >= PRACTICE_MIN_QUESTIONS) {
    if (seenIds.length >= PRACTICE_MAX_QUESTIONS) return { ok: true, question: null };
    const { se } = estimateTheta(
      responses.map((r) => ({ itemId: r.questionId, correct: r.correct, a: r.a, b: r.b, c: r.c })),
    );
    if (se < PRACTICE_SE_THRESHOLD) return { ok: true, question: null };
  }

  const unseen = quiz.questionIds.filter((id) => !seenIds.includes(id));
  if (unseen.length === 0) return { ok: true, question: null };
  const details = await getQuestionDetails(unseen);
  if (details.length === 0) return { ok: true, question: null };

  const pool: Array<{ id: string } & ItemParams> = details.map((d) => ({
    id: d.id,
    a: d.a,
    b: d.b,
    c: d.c,
  }));
  const picked = selectNextItem(pool, theta, new Set(seenIds));
  if (!picked) return { ok: true, question: null };

  const question = details.find((d) => d.id === picked.id);
  if (!question) return { ok: false, error: 'Question content not found' };
  return {
    ok: true,
    question: {
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      correct: question.correct,
      explanation: question.explanation,
      a: question.a,
      b: question.b,
      c: question.c,
    },
  };
}

export type QuizAnswerResult =
  | { ok: true; correct: boolean; explanation: string | null; newTheta: number }
  | { ok: false; error: string };

/**
 * Submit an answer, update the running theta, and (if the quiz is
 * complete) finalise the attempt row and award XP. The client sends
 * the calibrated (a, b, c) it received with the question, so ability
 * estimation stays consistent with selection.
 */
export async function submitQuizAnswerAction(
  quizId: string,
  questionId: string,
  answer: string,
  elapsedMs: number,
  responses: readonly { questionId: string; correct: boolean; a: number; b: number; c: number }[],
  seenIds: readonly string[],
  attemptId?: string,
): Promise<QuizAnswerResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };

  const quiz = await getExamDefinition(quizId);
  if (!quiz) return { ok: false, error: 'Quiz not found' };

  const detail = await getQuestionDetail(questionId);
  if (!detail) return { ok: false, error: 'Question not found' };

  const correct = answer === detail.correct;

  // Per-topic mastery (BKT) — the remediation and dashboard heatmap
  // read this. Best effort: never fail an answer on tracking errors.
  try {
    const topic = quiz.course && quiz.unit ? topicKey(quiz.course, quiz.unit) : null;
    if (topic) {
      const db = getDb() as SqliteDb;
      const [row] = await db
        .select()
        .from(schema.userSkillMastery)
        .where(
          and(
            eq(schema.userSkillMastery.userId, session.user.id),
            eq(schema.userSkillMastery.topic, topic),
          ),
        )
        .limit(1);
      const prior = row?.mastery ?? 0.3;
      const mastery = bktUpdate(prior, correct);
      if (row) {
        await db
          .update(schema.userSkillMastery)
          .set({ mastery, attempts: row.attempts + 1, updatedAt: new Date() })
          .where(eq(schema.userSkillMastery.id, row.id));
      } else {
        await db.insert(schema.userSkillMastery).values({
          userId: session.user.id,
          topic,
          mastery,
          attempts: 1,
        });
      }
    }
  } catch {
    // Tracking must never break answering.
  }

  // Update theta with the full response history (current + prior).
  const allResponses: Response[] = [
    ...responses.map((r) => ({
      itemId: r.questionId,
      correct: r.correct,
      a: r.a,
      b: r.b,
      c: r.c,
    })),
    { itemId: questionId, correct, a: detail.a, b: detail.b, c: detail.c },
  ];
  const { theta } = estimateTheta(allResponses);

  const isComplete = seenIds.length + 1 >= quiz.questionIds.length;
  if (isComplete) {
    const score = responses.filter((r) => r.correct).length + (correct ? 1 : 0);
    const totalCount = quiz.questionIds.length;
    const finalScore = totalCount > 0 ? score / totalCount : 0;

    const db = getDb() as SqliteDb;
    const { gainedXp } = applyXpBatch(0, [
      {
        event: { kind: finalScore >= 1 ? 'quizPerfect' : 'quizPass', score: finalScore },
        minutesAgo: 0,
      },
    ]);
    const [userXp] = await db
      .select()
      .from(schema.userXp)
      .where(eq(schema.userXp.userId, session.user.id))
      .limit(1);
    if (userXp) {
      await db
        .update(schema.userXp)
        .set({ totalXp: userXp.totalXp + gainedXp, lastEventAt: new Date() })
        .where(eq(schema.userXp.userId, session.user.id));
    } else {
      await db
        .insert(schema.userXp)
        .values({ userId: session.user.id, totalXp: gainedXp, lastEventAt: new Date() });
    }

    // Finalise the attempt row so exam gating can read the best score.
    // Rows with durationMs = 0 are abandoned attempts and are ignored.
    const attemptDetail = [
      ...responses.map((r) => ({ questionId: r.questionId, given: '', correct: r.correct, ms: 0 })),
      { questionId, given: answer, correct, ms: elapsedMs },
    ];
    if (attemptId) {
      await db
        .update(schema.userQuizAttempts)
        .set({
          score: finalScore,
          correctCount: score,
          durationMs: elapsedMs,
          completedAt: new Date(),
          finalTheta: theta,
          detail: attemptDetail,
        })
        .where(
          and(
            eq(schema.userQuizAttempts.id, attemptId),
            eq(schema.userQuizAttempts.userId, session.user.id),
          ),
        );
    }

    await db.insert(schema.activityLog).values({
      userId: session.user.id,
      event: 'quiz_completed',
      payload: { quizId, score, totalCount, theta, elapsedMs },
    });
    revalidatePath('/practice/quiz');
  }

  return {
    ok: true,
    correct,
    explanation: detail.explanation || null,
    newTheta: theta,
  };
}

export type QuizFinishResult =
  | { ok: true; score: number; correctCount: number; totalCount: number }
  | { ok: false; error: string };

/**
 * Finalise an attempt that did not run to exhaustion (timer expiry or
 * adaptive early stop). Scores over the whole exam (unanswered count
 * as wrong, like a real certification). Skips attempts that a submit
 * already finalised (completedAt set).
 */
export async function finishQuizAction(
  quizId: string,
  attemptId: string,
  responses: readonly { questionId: string; correct: boolean }[],
  elapsedMs: number,
): Promise<QuizFinishResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };
  const quiz = await getExamDefinition(quizId);
  if (!quiz) return { ok: false, error: 'Quiz not found' };

  const db = getDb() as SqliteDb;
  const [attempt] = await db
    .select()
    .from(schema.userQuizAttempts)
    .where(
      and(
        eq(schema.userQuizAttempts.id, attemptId),
        eq(schema.userQuizAttempts.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!attempt) return { ok: false, error: 'Attempt not found' };
  if (attempt.completedAt) {
    const total = quiz.questionIds.length;
    return {
      ok: true,
      score: attempt.score,
      correctCount: attempt.correctCount,
      totalCount: total,
    };
  }

  const totalCount = quiz.questionIds.length;
  const correctCount = responses.filter((r) => r.correct).length;
  const score = totalCount > 0 ? correctCount / totalCount : 0;
  const { theta } = estimateTheta(
    responses.map((r) => ({ itemId: r.questionId, correct: r.correct, a: 1, b: 0, c: 0.25 })),
  );
  const { gainedXp } = applyXpBatch(0, [
    { event: { kind: score >= 1 ? 'quizPerfect' : 'quizPass', score }, minutesAgo: 0 },
  ]);
  const [userXp] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.userId, session.user.id))
    .limit(1);
  if (userXp) {
    await db
      .update(schema.userXp)
      .set({ totalXp: userXp.totalXp + gainedXp, lastEventAt: new Date() })
      .where(eq(schema.userXp.userId, session.user.id));
  } else {
    await db
      .insert(schema.userXp)
      .values({ userId: session.user.id, totalXp: gainedXp, lastEventAt: new Date() });
  }

  await db
    .update(schema.userQuizAttempts)
    .set({
      score,
      correctCount,
      durationMs: elapsedMs,
      completedAt: new Date(),
      finalTheta: theta,
      detail: responses.map((r) => ({
        questionId: r.questionId,
        given: '',
        correct: r.correct,
        ms: 0,
      })),
    })
    .where(eq(schema.userQuizAttempts.id, attemptId));

  await db.insert(schema.activityLog).values({
    userId: session.user.id,
    event: 'quiz_completed',
    payload: { quizId, score: correctCount, totalCount, theta, elapsedMs },
  });
  revalidatePath('/practice/quiz');
  return { ok: true, score, correctCount, totalCount };
}

export type QuizRemediationResult = { ok: true; enqueued: number } | { ok: false; error: string };

/**
 * Remediation loop: enqueue one SRS card per failed question id.
 * Idempotent — questions already in the deck are skipped. Cards are
 * `cardType: 'quiz'` and resolve to prompt/answer via the question
 * content (DB or `questions/*.json`).
 */
export async function enqueueQuizRemediationAction(
  questionIds: readonly string[],
): Promise<QuizRemediationResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in' };
  const db = getDb() as SqliteDb;
  let enqueued = 0;
  for (const questionId of questionIds.slice(0, 50)) {
    const detail = await getQuestionDetail(questionId);
    if (!detail) continue;
    const [existing] = await db
      .select({ id: schema.srsCards.id })
      .from(schema.srsCards)
      .where(
        and(
          eq(schema.srsCards.userId, session.user.id),
          eq(schema.srsCards.cardType, 'quiz'),
          eq(schema.srsCards.contentId, questionId),
        ),
      )
      .limit(1);
    if (existing) continue;
    await db.insert(schema.srsCards).values({
      userId: session.user.id,
      cardType: 'quiz',
      contentId: questionId,
      state: serializeState(
        createInitialCard(),
      ) as string as unknown as typeof schema.srsCards.$inferInsert.state,
    });
    enqueued += 1;
  }
  revalidatePath('/practice/srs');
  return { ok: true, enqueued };
}
