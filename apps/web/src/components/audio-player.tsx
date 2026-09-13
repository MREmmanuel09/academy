'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioPlayerProps {
  text: string;
  lang?: 'en-US' | 'en-GB' | 'es-ES';
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}

export function AudioPlayer({
  text,
  lang = 'en-US',
  className = '',
  size = 'sm',
  label,
}: AudioPlayerProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.split('-')[0] ?? lang;
    const match =
      voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(langPrefix));
    if (match) utterance.voice = match;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, lang, supported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  if (!supported) return null;

  const sizeClasses = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      title={label ?? `Listen to "${text}"`}
      className={`inline-flex items-center justify-center rounded-md border border-border bg-muted transition-all hover:bg-primary/10 hover:border-primary/30 ${sizeClasses} ${speaking ? 'animate-pulse bg-primary/20 border-primary/40' : ''} ${className}`}
    >
      {speaking ? (
        <svg
          className="h-4 w-4 animate-pulse text-primary"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 text-muted-foreground"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  );
}
