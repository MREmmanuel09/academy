'use client';

import { markLessonCompleteAction } from '@/app/actions/progress';
import { InlineQuiz, type QuizQuestion } from '@/components/inline-quiz';
import { Link } from '@/components/link';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useMemo, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

const CodePlayground = dynamic(
  () => import('@/components/code-playground').then((m) => m.CodePlayground),
  { ssr: false, loading: () => <div className="my-6 h-48 animate-pulse rounded-lg bg-muted" /> },
);

export interface LessonViewerProps {
  courseSlug: string;
  unitSlug: string;
  lessonSlug: string;
  /** Lesson body in Markdown. */
  body: string;
  title: string;
  /** Optional estimated time (for the "X min" badge). */
  estimatedMinutes?: number;
  /** Optional key takeaways (parsed from the original RedLab lesson). */
  keyTakeaways?: string[];
  /** URLs for the prev/next lessons (null if at boundary). */
  previousHref?: string | null;
  nextHref?: string | null;
  /** True if the lesson has been completed by the current user. */
  alreadyCompleted: boolean;
  /** When true, the body is hidden behind a locked panel (path gating). */
  locked?: boolean;
  /** Why the lesson is locked (shown in the panel). */
  lockedReason?: string;
  /** Where the "continue" CTA points (previous incomplete lesson/unit). */
  continueHref?: string | null;
  /** Label detail for the continue CTA (lesson/unit title). */
  continueTitle?: string;
}

/**
 * Strips the leading H1 from markdown body since the title is already
 * shown in the page header.
 */
function stripLeadingH1(body: string): string {
  return body.replace(/^#\s+.+\n+/, '');
}

export function LessonViewer({
  courseSlug,
  unitSlug,
  lessonSlug,
  body,
  title,
  estimatedMinutes,
  keyTakeaways,
  previousHref,
  nextHref,
  alreadyCompleted,
  locked = false,
  lockedReason,
  continueHref,
  continueTitle,
}: LessonViewerProps) {
  const t = useTranslations('courseBrowser');
  const [done, setDone] = useState(alreadyCompleted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { isOnline, enqueue } = useOfflineSync();

  // Parse inline quizzes and code blocks from the markdown body
  const { cleanBody, quizzes, codeBlocks } = useMemo(() => {
    const quizRegex = /:::quiz\n([\s\S]*?)\n:::/g;
    const codeRegex = /:::code\s+(python|sql)\n([\s\S]*?)\n:::/g;
    const extracted: QuizQuestion[][] = [];
    const codes: { lang: 'python' | 'sql'; code: string }[] = [];
    let cleaned = body;
    let idx = 0;

    // Extract quizzes
    for (const match of body.matchAll(quizRegex)) {
      try {
        const questions = JSON.parse(match[1] ?? '') as QuizQuestion[];
        extracted.push(questions);
        cleaned = cleaned.replace(match[0], `__QUIZ_${idx}__`);
        idx++;
      } catch {
        // Invalid JSON, skip
      }
    }

    // Extract code blocks
    let codeIdx = 0;
    for (const match of cleaned.matchAll(codeRegex)) {
      const lang = match[1] === 'sql' ? 'sql' : 'python';
      const code = match[2]?.trim() ?? '';
      codes.push({ lang, code });
      cleaned = cleaned.replace(match[0], `__CODE_${codeIdx}__`);
      codeIdx++;
    }

    return { cleanBody: cleaned, quizzes: extracted, codeBlocks: codes };
  }, [body]);

  const headings = extractH2Headings(cleanBody);
  const cleanedBody = stripLeadingH1(cleanBody);

  // Split markdown by quiz and code markers and render interleaved
  const parts = useMemo(() => {
    const tokens = cleanedBody.split(/(__QUIZ_\d+__|__CODE_\d+__)/);
    const segments: {
      type: 'markdown' | 'quiz' | 'code';
      content: string | QuizQuestion[] | { lang: 'python' | 'sql'; code: string };
    }[] = tokens.map((token) => {
      const quizMatch = /^__QUIZ_(\d+)__$/.exec(token);
      if (quizMatch) {
        const quizIdx = Number.parseInt(quizMatch[1] ?? '', 10);
        return { type: 'quiz' as const, content: quizzes[quizIdx] ?? [] };
      }
      const codeMatch = /^__CODE_(\d+)__$/.exec(token);
      if (codeMatch) {
        const codeIdx = Number.parseInt(codeMatch[1] ?? '', 10);
        return {
          type: 'code' as const,
          content: codeBlocks[codeIdx] ?? { lang: 'python', code: '' },
        };
      }
      return { type: 'markdown' as const, content: token };
    });
    return segments;
  }, [cleanedBody, quizzes, codeBlocks]);

  return (
    <article className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <div className="min-w-0">
        <header className="mb-8 space-y-3 border-b border-border pb-6">
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/courses/${courseSlug}`}
              className="font-medium text-primary hover:underline hover:underline-offset-2"
            >
              {t('backToCourse')}
            </Link>
            <span className="mx-2 text-muted-foreground/50" aria-hidden="true">
              /
            </span>
            <span className="text-muted-foreground">{unitSlug}</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {estimatedMinutes ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {estimatedMinutes} min
              </span>
            </div>
          ) : null}
        </header>

        {locked ? (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-50 p-8 text-center dark:bg-amber-950/30"
            role="note"
          >
            <p className="text-4xl" aria-hidden="true">
              🔒
            </p>
            <p className="mt-4 text-xl font-bold tracking-tight">{t('locked')}</p>
            {lockedReason ? (
              <p className="mt-2 text-sm text-muted-foreground">{lockedReason}</p>
            ) : null}
            {continueHref ? (
              <Link
                href={continueHref}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('continueWith', { title: continueTitle ?? '' })} →
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="prose prose-slate max-w-none dark:prose-invert">
              {parts.map((part, i) =>
                part.type === 'quiz' ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: segments derive from static markdown order, never reordered
                  <InlineQuiz key={`quiz-${i}`} questions={part.content as QuizQuestion[]} />
                ) : part.type === 'code' ? (
                  <CodePlayground
                    // biome-ignore lint/suspicious/noArrayIndexKey: segments derive from static markdown order, never reordered
                    key={`code-${i}`}
                    language={(part.content as { lang: 'python' | 'sql'; code: string }).lang}
                    initialCode={(part.content as { lang: 'python' | 'sql'; code: string }).code}
                    className="my-6"
                  />
                ) : (
                  <ReactMarkdown
                    // biome-ignore lint/suspicious/noArrayIndexKey: segments derive from static markdown order, never reordered
                    key={`md-${i}`}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      a: ({ href, children, ...rest }) => (
                        <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
                          {children}
                        </a>
                      ),
                      code: ({ className, children, ...rest }) => {
                        const isBlock = className?.startsWith('language-');
                        return isBlock ? (
                          <code className={className} {...rest}>
                            {children}
                          </code>
                        ) : (
                          <code
                            className="rounded bg-muted px-1.5 py-0.5 text-sm font-medium"
                            {...rest}
                          >
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children, ...rest }) => (
                        <pre
                          className="rounded-lg border border-border bg-[hsl(222.2,84%,4.9%)] p-4 text-[hsl(210,40%,98%)] overflow-x-auto text-sm leading-relaxed"
                          {...rest}
                        >
                          {children}
                        </pre>
                      ),
                      table: ({ children, ...rest }) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm" {...rest}>
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children, ...rest }) => (
                        <thead className="border-b-2 border-border bg-muted/50" {...rest}>
                          {children}
                        </thead>
                      ),
                      th: ({ children, ...rest }) => (
                        <th
                          className="px-4 py-2.5 text-left font-semibold text-foreground"
                          {...rest}
                        >
                          {children}
                        </th>
                      ),
                      td: ({ children, ...rest }) => (
                        <td className="border-b border-border px-4 py-2" {...rest}>
                          {children}
                        </td>
                      ),
                      blockquote: ({ children, ...rest }) => (
                        <blockquote
                          className="my-4 rounded-r-lg border-l-4 border-primary bg-primary/5 py-3 pl-4 pr-4 italic text-foreground/90"
                          {...rest}
                        >
                          {children}
                        </blockquote>
                      ),
                      h2: ({ children, ...rest }) => (
                        <h2
                          className="mt-10 mb-4 text-xl font-bold tracking-tight border-b border-border pb-2"
                          {...rest}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...rest }) => (
                        <h3 className="mt-8 mb-3 text-lg font-semibold" {...rest}>
                          {children}
                        </h3>
                      ),
                      ul: ({ children, ...rest }) => (
                        <ul className="my-3 list-disc space-y-1 pl-6" {...rest}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...rest }) => (
                        <ol className="my-3 list-decimal space-y-1 pl-6" {...rest}>
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...rest }) => (
                        <li className="leading-relaxed" {...rest}>
                          {children}
                        </li>
                      ),
                      p: ({ children, ...rest }) => (
                        <p className="my-3 leading-relaxed" {...rest}>
                          {children}
                        </p>
                      ),
                      hr: () => <hr className="my-8 border-border" />,
                      strong: ({ children, ...rest }) => (
                        <strong className="font-semibold text-foreground" {...rest}>
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {part.content as string}
                  </ReactMarkdown>
                ),
              )}
            </div>

            {keyTakeaways && keyTakeaways.length > 0 ? (
              <Card className="mt-8 border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      !
                    </span>
                    {t('keyTakeaways')}
                  </h2>
                  <ul className="ml-5 space-y-2 text-sm leading-relaxed">
                    {keyTakeaways.map((k) => (
                      <li key={k} className="list-disc pl-1 text-foreground/90">
                        {k}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <div className="flex gap-2">
                {previousHref ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={previousHref} className="gap-1">
                      <span aria-hidden="true">&larr;</span> {t('previousLesson')}
                    </Link>
                  </Button>
                ) : null}
                {nextHref ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={nextHref} className="gap-1">
                      {t('nextLesson')} <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </Button>
                ) : null}
              </div>
              <Button
                size="sm"
                disabled={pending || done}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    if (!isOnline) {
                      // Queue for later sync
                      await enqueue('markLessonComplete', {
                        courseSlug,
                        unitSlug,
                        lessonSlug,
                      });
                      setDone(true);
                      return;
                    }

                    const result = await markLessonCompleteAction(courseSlug, unitSlug, lessonSlug);
                    if (!result.ok) {
                      setError(result.error);
                    } else {
                      setDone(true);
                    }
                  });
                }}
              >
                {done ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {t('completedLesson')}
                  </span>
                ) : pending ? (
                  '...'
                ) : (
                  t('markComplete')
                )}
              </Button>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>

      <aside className="hidden lg:block">
        <nav aria-label={t('tableOfContents')} className="sticky top-20">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('tableOfContents')}
          </h2>
          <ol className="space-y-1.5 text-sm">
            {headings.length === 0 ? (
              <li className="text-muted-foreground">&mdash;</li>
            ) : (
              headings.map((h, i) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate">{h.text}</span>
                  </a>
                </li>
              ))
            )}
          </ol>
        </nav>
      </aside>
    </article>
  );
}

/** Extract the H2 headings from a Markdown body and assign ids. */
function extractH2Headings(md: string): { id: string; text: string }[] {
  const lines = md.split('\n');
  const out: { id: string; text: string }[] = [];
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1] ?? '';
    const id = text
      .toLowerCase()
      .normalize('NFD')
      // Strip combining diacritical marks (U+0300–U+036F).
      .replace(/[̀ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (id) out.push({ id, text });
  }
  return out;
}
