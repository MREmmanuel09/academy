'use client';

import { SPEAKING_PASS_THRESHOLD, speechScore } from '@/lib/speaking-score';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeakButtonProps {
  /** Expected sentence (English). */
  text: string;
  lang?: string;
  className?: string;
}

interface SpeechAlternative {
  transcript: string;
}

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<SpeechAlternative>>;
}

interface SpeechRecognizer {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognizerCtor = new () => SpeechRecognizer;

/** True in browsers with the Web Speech recognition API. */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return (
    typeof w.SpeechRecognition === 'function' || typeof w.webkitSpeechRecognition === 'function'
  );
}

type Phase = 'idle' | 'listening' | 'scored' | 'unsupported' | 'error';

/**
 * Push-to-talk pronunciation practice: records one utterance, scores
 * it against the expected sentence, and shows word accuracy plus the
 * transcript. Renders nothing where the API is missing.
 */
export function SpeakButton({ text, lang = 'en-US', className = '' }: SpeakButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [transcript, setTranscript] = useState('');
  const recogRef = useRef<SpeechRecognizer | null>(null);

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) setPhase('unsupported');
    return () => {
      try {
        recogRef.current?.abort();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch {
      setPhase('idle');
    }
  }, []);

  const listen = useCallback(() => {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | SpeechRecognizerCtor
      | undefined;
    if (!Ctor) {
      setPhase('unsupported');
      return;
    }
    const recog = new Ctor();
    recog.lang = lang;
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recogRef.current = recog;
    recog.onresult = (event: SpeechResultEvent) => {
      const said = event.results[0]?.[0]?.transcript ?? '';
      setTranscript(said);
      setAccuracy(speechScore(text, said).accuracy);
      setPhase('scored');
    };
    recog.onerror = () => setPhase('error');
    recog.onend = () => {
      recogRef.current = null;
    };
    try {
      recog.start();
      setPhase('listening');
      setTranscript('');
      setAccuracy(null);
    } catch {
      setPhase('error');
    }
  }, [text, lang]);

  if (phase === 'unsupported') return null;

  const pct = accuracy === null ? null : Math.round(accuracy * 100);
  const passed = accuracy !== null && accuracy >= SPEAKING_PASS_THRESHOLD;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {phase === 'listening' ? (
        <button
          type="button"
          onClick={stop}
          title="Stop recording"
          className="inline-flex h-7 w-7 animate-pulse items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={listen}
          title={`Say: "${text}"`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:border-primary/40 hover:bg-primary/10"
        >
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm6-3a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.94V22h2v-2.06A8 8 0 0 0 20 12h-2z" />
          </svg>
        </button>
      )}
      {phase === 'listening' ? (
        <span className="text-xs text-muted-foreground">Listening…</span>
      ) : null}
      {phase === 'scored' && pct !== null ? (
        <span
          className={`text-xs font-semibold ${passed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
        >
          {pct}%{transcript ? ` · “${transcript}”` : ''}
        </span>
      ) : null}
      {phase === 'error' ? (
        <button type="button" onClick={listen} className="text-xs text-muted-foreground underline">
          Mic error — try again
        </button>
      ) : null}
    </span>
  );
}
