'use client';

import { markLessonCompleteAction } from '@/app/actions/progress';
import { enqueueEpisodeVocabAction } from '@/app/actions/srs';
import { AudioPlayer } from '@/components/audio-player';
import { InlineQuiz, type QuizQuestion } from '@/components/inline-quiz';
import { SpeakButton, isSpeechRecognitionSupported } from '@/components/speak-button';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import {
  extractDialogueLines,
  extractEpisodeQuiz,
  extractSrsWordList,
  extractVocabTerms,
  stripInteractiveSections,
} from '@/lib/episode-parse';
import { Button, Card, CardContent } from '@academy/ui';
import { useEffect, useMemo, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface EpisodeViewerProps {
  markdown: string;
  title: string;
  arcTitle: string;
  arcColor?: string;
  level?: string;
  estimatedMinutes?: number;
  episodeIndex: number;
  totalEpisodes: number;
  previousHref?: string | null;
  nextHref?: string | null;
  /** Path slugs enable completion + SRS (omitted = read-only preview). */
  courseSlug?: string;
  unitSlug?: string;
  lessonSlug?: string;
  alreadyCompleted?: boolean;
}

type Tab = 'story' | 'quiz' | 'speak' | 'vocab' | 'characters';

export function EpisodeViewer({
  markdown,
  title,
  arcTitle,
  arcColor = '#1e40af',
  level,
  estimatedMinutes,
  episodeIndex,
  totalEpisodes,
  previousHref,
  nextHref,
  courseSlug,
  unitSlug,
  lessonSlug,
  alreadyCompleted = false,
}: EpisodeViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [speechOK, setSpeechOK] = useState<boolean | null>(null);
  const [done, setDone] = useState(alreadyCompleted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [srsAdded, setSrsAdded] = useState<number | null>(null);
  const [srsPending, startSrsTransition] = useTransition();
  const { isOnline, enqueue } = useOfflineSync();

  useEffect(() => {
    setSpeechOK(isSpeechRecognitionSupported());
  }, []);

  const vocabTerms = useMemo(() => extractVocabTerms(markdown), [markdown]);
  const quiz = useMemo<QuizQuestion[]>(
    () =>
      extractEpisodeQuiz(markdown).map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
      })),
    [markdown],
  );
  const srsWords = useMemo(() => extractSrsWordList(markdown), [markdown]);
  const dialogue = useMemo(() => extractDialogueLines(markdown), [markdown]);

  // Extract characters section
  const characters = useMemo(() => {
    const charMatch = /## Characters in this episode\n\n([\s\S]*?)(?=\n---|\n##)/.exec(markdown);
    return charMatch?.[1]?.trim() ?? '';
  }, [markdown]);

  // Remove metadata sections from the main story display. Interactive
  // sections (quiz/SRS) render as dedicated tabs instead of spoilers.
  const storyBody = useMemo(() => {
    let body = stripInteractiveSections(markdown);
    // Remove frontmatter
    body = body.replace(/^---[\s\S]*?---\n*/m, '');
    // Remove the title (already shown in header)
    body = body.replace(/^#\s+.+\n+/, '');
    return body.trim();
  }, [markdown]);

  const canInteract = Boolean(courseSlug && unitSlug && lessonSlug);

  const markComplete = () => {
    if (!courseSlug || !unitSlug || !lessonSlug) return;
    setError(null);
    startTransition(async () => {
      if (!isOnline) {
        await enqueue('markLessonComplete', { courseSlug, unitSlug, lessonSlug });
        setDone(true);
        return;
      }
      const result = await markLessonCompleteAction(courseSlug, unitSlug, lessonSlug);
      if (!result.ok) setError(result.error);
      else setDone(true);
    });
  };

  const addToSrs = () => {
    if (!unitSlug || !lessonSlug || vocabTerms.length === 0) return;
    // Prefer the curated SRS list; fall back to all extracted terms.
    const wanted =
      srsWords.length > 0
        ? vocabTerms.filter((v) => srsWords.some((w) => w.toLowerCase() === v.term.toLowerCase()))
        : vocabTerms;
    const terms = (wanted.length > 0 ? wanted : vocabTerms).map((v) => ({
      term: v.term,
      translation: v.translation,
    }));
    setSrsAdded(null);
    startSrsTransition(async () => {
      const result = await enqueueEpisodeVocabAction(terms, unitSlug, lessonSlug);
      if (result.ok) setSrsAdded(result.enqueued);
      else setError(result.error);
    });
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'story', label: '📖 Story' },
    ...(quiz.length > 0 ? [{ id: 'quiz' as Tab, label: '❓ Quiz' }] : []),
    ...(dialogue.length > 0 ? [{ id: 'speak' as Tab, label: '🎤 Speak' }] : []),
    { id: 'vocab', label: `📚 Vocabulary (${vocabTerms.length})` },
    { id: 'characters', label: '🎭 Characters' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: arcColor }}
          >
            {arcTitle}
          </span>
          {level && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {level}
            </span>
          )}
          {estimatedMinutes && (
            <span className="text-xs text-muted-foreground">~{estimatedMinutes} min</span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Episode {episodeIndex + 1} of {totalEpisodes}
          </span>
          {canInteract ? (
            <Button size="sm" disabled={pending || done} onClick={markComplete}>
              {done ? '✓ Completed' : pending ? '…' : 'Mark episode complete'}
            </Button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </header>

      {/* Tab navigation */}
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`episode-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`episode-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'story' && (
        <div role="tabpanel" id="episode-panel-story" aria-labelledby="episode-tab-story">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
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
                blockquote: ({ children, ...rest }) => (
                  <blockquote
                    className="my-4 rounded-r-lg border-l-4 border-primary bg-primary/5 py-3 pl-4 pr-4 italic text-foreground/90"
                    {...rest}
                  >
                    {children}
                  </blockquote>
                ),
                strong: ({ children, ...rest }) => {
                  const text = String(children);
                  // Highlight character dialogue
                  if (text.endsWith(':') && text.length < 50) {
                    return (
                      <strong className="font-semibold text-primary" {...rest}>
                        {children}
                      </strong>
                    );
                  }
                  return (
                    <strong className="font-semibold text-foreground" {...rest}>
                      {children}
                    </strong>
                  );
                },
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
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground" {...rest}>
                    {children}
                  </th>
                ),
                td: ({ children, ...rest }) => (
                  <td className="border-b border-border px-4 py-2" {...rest}>
                    {children}
                  </td>
                ),
                p: ({ children, ...rest }) => (
                  <p className="my-3 leading-relaxed" {...rest}>
                    {children}
                  </p>
                ),
                hr: () => <hr className="my-8 border-border" />,
              }}
            >
              {storyBody}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {activeTab === 'quiz' && quiz.length > 0 && (
        <div role="tabpanel" id="episode-panel-quiz" aria-labelledby="episode-tab-quiz">
          <InlineQuiz questions={quiz} onComplete={() => undefined} />
        </div>
      )}

      {activeTab === 'speak' && dialogue.length > 0 && (
        <div role="tabpanel" id="episode-panel-speak" aria-labelledby="episode-tab-speak">
          <Card>
            <CardContent className="space-y-1 p-4">
              {speechOK === false ? (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Your browser has no speech recognition — listen with the 🔊 button and repeat out
                  loud. Chrome on desktop works best for scoring.
                </p>
              ) : null}
              <p className="pb-2 text-sm text-muted-foreground">
                Listen, then say each line. Aim for 70%+ match.
              </p>
              <ul className="space-y-3">
                {dialogue.map((d, i) => (
                  <li key={`${d.speaker}-${i}`} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {d.speaker}
                    </p>
                    <p className="mt-1 font-medium">“{d.text}”</p>
                    <div className="mt-2 flex items-center gap-2">
                      <AudioPlayer text={d.text} lang="en-US" size="sm" />
                      <SpeakButton text={d.text} lang="en-US" />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'vocab' && (
        <div role="tabpanel" id="episode-panel-vocab" aria-labelledby="episode-tab-vocab">
          <Card>
            <CardContent className="space-y-3 p-4">
              {canInteract && vocabTerms.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {srsAdded !== null
                      ? `Added ${srsAdded} word${srsAdded === 1 ? '' : 's'} to your SRS deck.`
                      : 'Send these words to spaced repetition.'}
                  </p>
                  <Button size="sm" variant="outline" disabled={srsPending} onClick={addToSrs}>
                    {srsPending
                      ? '…'
                      : `+ SRS (${srsWords.length > 0 ? srsWords.length : vocabTerms.length})`}
                  </Button>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {vocabTerms.map((v, i) => (
                  <div
                    key={`${v.term}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{v.term}</span>
                      <AudioPlayer text={v.term} lang="en-US" size="sm" />
                      {v.note && <span className="text-xs text-muted-foreground">{v.note}</span>}
                    </div>
                    <span className="text-sm text-muted-foreground">{v.translation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'characters' && (
        <div role="tabpanel" id="episode-panel-characters" aria-labelledby="episode-tab-characters">
          <Card>
            <CardContent className="p-4">
              {characters ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{characters}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">No character information available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <div>
          {previousHref && (
            <Button asChild variant="outline" size="sm">
              <a href={previousHref}>
                <span aria-hidden="true">&larr;</span> Previous Episode
              </a>
            </Button>
          )}
        </div>
        <div>
          {nextHref && (
            <Button asChild variant="outline" size="sm">
              <a href={nextHref}>
                Next Episode <span aria-hidden="true">&rarr;</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
