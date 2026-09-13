import { setRequestLocale } from 'next-intl/server';
import { QuizClient } from './quiz-client';

interface QuizPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ quiz?: string; returnTo?: string; returnLabel?: string; mode?: string }>;
}

/**
 * Adaptive quiz page. Defaults to the first RedLab exam if no `quiz`
 * query parameter is provided. `mode=exam` runs the full certification
 * format (timer + pass/fail); anything else is adaptive practice.
 */
export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const quizId = sp.quiz ?? 'exam-basic';
  const mode = sp.mode === 'exam' ? 'exam' : 'practice';
  return (
    <QuizClient quizId={quizId} returnTo={sp.returnTo} returnLabel={sp.returnLabel} mode={mode} />
  );
}
