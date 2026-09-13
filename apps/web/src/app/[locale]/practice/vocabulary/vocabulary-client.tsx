'use client';

import { enqueueSrsCardAction } from '@/app/actions/srs';
import { FlashcardDeck, type VocabWord } from '@/components/flashcard-deck';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export interface VocabPreview {
  id: string;
  term: string;
  translation: string;
}

export interface VocabularyClientProps {
  totalVocab: number;
  inDeck: number;
  signedIn: boolean;
  preview: VocabPreview[];
}

export function VocabularyClient({ totalVocab, inDeck, signedIn, preview }: VocabularyClientProps) {
  const t = useTranslations('vocab');
  const [count, setCount] = useState(inDeck);
  const [adding, startAdd] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'flashcards'>('list');
  const router = useRouter();

  const addBatch = () => {
    if (!signedIn) {
      router.push('/login?next=/practice/vocabulary');
      return;
    }
    setError(null);
    startAdd(async () => {
      let added = 0;
      for (const w of preview) {
        const r = await enqueueSrsCardAction('vocab', w.id);
        if (r.ok && r.created) added += 1;
      }
      setCount((c) => c + added);
    });
  };

  const flashcardWords: VocabWord[] = preview.map((w) => ({
    id: w.id,
    term: w.term,
    translation: w.translation,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('title')}</h2>
            <div className="flex gap-2">
              <Button
                variant={mode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('list')}
              >
                📋 List
              </Button>
              <Button
                variant={mode === 'flashcards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('flashcards')}
              >
                🃏 Flashcards
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">{t('subtitle')}</p>
          <p className="text-sm">
            <span className="font-medium">{count}</span> / {totalVocab}{' '}
            <span className="text-muted-foreground">in your deck</span>
          </p>
          {signedIn ? (
            <Button onClick={addBatch} disabled={adding}>
              {adding ? '…' : t('addToDeck', { count: preview.length })}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Inicia sesión para empezar.</p>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {mode === 'flashcards' ? (
        <FlashcardDeck words={flashcardWords} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <p className="font-medium">{w.term}</p>
                <p className="text-sm text-muted-foreground">{w.translation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
