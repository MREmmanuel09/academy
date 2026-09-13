'use client';

import { completeOnboardingAction } from '@/app/actions/auth';
import { Link } from '@/components/link';
import { Button, Card, CardContent } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

interface OnboardingFormProps {
  defaultLocale: 'es' | 'en';
  defaultTimezone: string;
}

const GOALS: Array<{ id: 'devops' | 'data' | 'english'; label: string; icon: string }> = [
  { id: 'devops', label: 'DevOps & Cloud', icon: '⚙️' },
  { id: 'data', label: 'Data & Analytics', icon: '📊' },
  { id: 'english', label: 'English', icon: '🌐' },
];

export function OnboardingForm({ defaultLocale, defaultTimezone }: OnboardingFormProps) {
  const t = useTranslations('onboarding');
  const [locale, setLocale] = useState<'es' | 'en'>(defaultLocale);
  const [goals, setGoals] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleGoal = (g: string) => {
    setGoals((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  return (
    <form
      action={(fd) => {
        setError(null);
        for (const g of goals) fd.append('goals', g);
        startTransition(async () => {
          const result = await completeOnboardingAction(fd);
          if (!result.ok) setError(result.error);
        });
      }}
      className="space-y-6"
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('languageLabel')}</legend>
        <div className="flex gap-3">
          {(['es', 'en'] as const).map((l) => (
            <label
              key={l}
              className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="preferredLocale"
                value={l}
                checked={locale === l}
                onChange={() => setLocale(l)}
                className="accent-primary"
              />
              <span className="text-sm">{l === 'es' ? 'Español' : 'English'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('goalsLabel')}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {GOALS.map((g) => {
            const active = goals.has(g.id);
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-md border p-3 text-left text-sm transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
              >
                <span aria-hidden="true">{g.icon}</span>
                {g.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <input type="hidden" name="timezone" value={defaultTimezone} />

      {goals.size > 0 ? (
        <div className="rounded-md border bg-muted/40 p-4" aria-live="polite">
          <p className="text-sm font-medium">{t('suggestedTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            {GOALS.filter((g) => goals.has(g.id)).map((g) => (
              <li key={g.id} className="text-sm text-muted-foreground">
                <Link
                  href={`/courses/${g.id}`}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  {g.label}
                </Link>{' '}
                — {t('suggestedDetail')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Button type="submit" disabled={pending || goals.size === 0} className="w-full">
        {pending ? t('saving') : t('start')}
      </Button>
    </form>
  );
}
