'use client';

import { AudioPlayer } from '@/components/audio-player';
import { Button, Card, CardContent } from '@academy/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface VocabWord {
  id: string;
  term: string;
  translation: string;
  partOfSpeech?: string;
  definitionEn?: string;
  definitionEs?: string;
  exampleEn?: string;
  exampleEs?: string;
}

export interface FlashcardDeckProps {
  words: VocabWord[];
  onComplete?: (score: { correct: number; total: number }) => void;
}

type Phase = 'guess' | 'reveal' | 'done';

export function FlashcardDeck({ words, onComplete }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('guess');
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffled, setShuffled] = useState<VocabWord[]>([]);

  // Shuffle on mount
  useEffect(() => {
    const arr = [...words].sort(() => Math.random() - 0.5);
    setShuffled(arr);
  }, [words]);

  const current = shuffled[currentIndex];
  const progress =
    shuffled.length > 0 ? ((currentIndex + (phase === 'done' ? 1 : 0)) / shuffled.length) * 100 : 0;

  const checkAnswer = useCallback(() => {
    if (!current || !userInput.trim()) return;
    const normalized = userInput.trim().toLowerCase();
    const expected = current.translation.toLowerCase();
    // Allow exact match or close match (remove accents, punctuation)
    const clean = (s: string) =>
      s
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9\s]/gu, '');
    const correct = clean(normalized) === clean(expected) || normalized === expected;
    setIsCorrect(correct);
    if (correct) setCorrectCount((c) => c + 1);
    setPhase('reveal');
  }, [current, userInput]);

  const handleNext = () => {
    if (currentIndex + 1 >= shuffled.length) {
      setPhase('done');
      onComplete?.({ correct: correctCount, total: shuffled.length });
    } else {
      setCurrentIndex((i) => i + 1);
      setPhase('guess');
      setUserInput('');
      setIsCorrect(null);
    }
  };

  const handleFlip = () => {
    setPhase('reveal');
  };

  const answerInputRef = useRef<HTMLInputElement>(null);

  // Focus the answer field when a new card is shown (replaces the
  // autofocus attribute: same UX, no a11y violation).
  useEffect(() => {
    if (phase === 'guess') answerInputRef.current?.focus({ preventScroll: true });
  }, [phase]);

  if (shuffled.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No vocabulary words to practice.
        </CardContent>
      </Card>
    );
  }

  if (phase === 'done') {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-3xl">
            {correctCount === shuffled.length
              ? '🎉'
              : correctCount > shuffled.length / 2
                ? '👍'
                : '📚'}
          </div>
          <p className="text-xl font-semibold">
            {correctCount} / {shuffled.length} correct
          </p>
          <p className="text-sm text-muted-foreground">
            {correctCount === shuffled.length
              ? 'Perfect! You know all the words!'
              : 'Keep practicing to improve your recall.'}
          </p>
          <Button
            onClick={() => {
              setCurrentIndex(0);
              setPhase('guess');
              setUserInput('');
              setIsCorrect(null);
              setCorrectCount(0);
              setShuffled((prev) => [...prev].sort(() => Math.random() - 0.5));
            }}
          >
            🔄 Practice Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {shuffled.length}
        </span>
      </div>

      {/* Flashcard (div+button role: native <button> impossible — the
          card nests audio player buttons; keyboard parity via Enter/Space) */}
      {/* biome-ignore lint/a11y/useSemanticElements: nested interactive children forbid native button */}
      <div
        role="button"
        tabIndex={phase === 'guess' ? 0 : -1}
        aria-label="Flip card"
        className={`relative min-h-[280px] cursor-pointer rounded-xl border-2 transition-all duration-300 ${
          phase === 'reveal'
            ? isCorrect
              ? 'border-green-500 bg-green-500/5'
              : 'border-red-500 bg-red-500/5'
            : 'border-border bg-card hover:border-primary/50'
        }`}
        onClick={phase === 'guess' ? handleFlip : undefined}
        onKeyDown={(e) => {
          if (phase === 'guess' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-8 text-center">
          {phase === 'guess' ? (
            <>
              <span className="text-xs text-muted-foreground mb-2">What does this mean?</span>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">{current?.term}</p>
                {current?.term && <AudioPlayer text={current.term} lang="en-US" size="sm" />}
              </div>
              {current?.partOfSpeech && (
                <span className="mt-2 text-sm text-muted-foreground italic">
                  {current.partOfSpeech}
                </span>
              )}
              <span className="mt-4 text-xs text-primary">
                Click to reveal or type your answer below
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-2xl font-bold">{current?.term}</p>
                {current?.term && <AudioPlayer text={current.term} lang="en-US" size="sm" />}
              </div>
              <p className="text-xl text-primary font-semibold mb-3">{current?.translation}</p>
              {isCorrect !== null && (
                <span
                  className={`text-sm font-medium ${
                    isCorrect
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </span>
              )}
              {current?.definitionEn && (
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  {current.definitionEn}
                </p>
              )}
              {current?.exampleEn && (
                <blockquote className="mt-3 text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                  &ldquo;{current.exampleEn}&rdquo;
                </blockquote>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input + actions */}
      {phase === 'guess' ? (
        <div className="flex gap-2">
          <input
            ref={answerInputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
            placeholder="Type the translation..."
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <Button onClick={checkAnswer} disabled={!userInput.trim()}>
            Check
          </Button>
          <Button variant="outline" onClick={handleFlip}>
            👁 Reveal
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleNext}>
            Skip →
          </Button>
          <Button onClick={handleNext}>
            {currentIndex + 1 >= shuffled.length ? 'See Results' : 'Next Card →'}
          </Button>
        </div>
      )}
    </div>
  );
}
