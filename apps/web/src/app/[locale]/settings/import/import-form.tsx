'use client';

import { importUserDataAction } from '@/app/actions/import';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

export interface ImportFormLabels {
  dropzone: string;
  fileChosen: string;
  pickAnother: string;
  submit: string;
  submitting: string;
  successTitle: string;
  failureTitle: string;
  imported: string;
  skipped: string;
  warnings: string;
  retry: string;
  backToSettings: string;
  source: string;
  sourceRedlab: string;
  sourceSprintL2: string;
  sourceAcademy: string;
  sourceUnknown: string;
  lessons: string;
  labs: string;
  quizAttempts: string;
  srsCards: string;
  achievements: string;
  activityEvents: string;
  passwordNote: string;
  invalidJson: string;
  tooLarge: string;
  noFile: string;
  emptyFile: string;
  unauthenticated: string;
  unknownError: string;
  maxSize: string;
}

interface ImportFormProps {
  labels: ImportFormLabels;
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | {
      kind: 'success';
      imported: SuccessSummary;
      skipped: SkippedSummary;
      warnings: string[];
      source: string;
    }
  | { kind: 'error'; code: string; message: string };

interface SuccessSummary {
  lessons: number;
  labs: number;
  quizAttempts: number;
  srsCards: number;
  achievements: number;
  activityEvents: number;
}
interface SkippedSummary {
  lessons: string[];
  achievements: string[];
  cards: string[];
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function ImportForm({ labels }: ImportFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  function onPick(f: File | null) {
    setFile(f);
    setState({ kind: 'idle' });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setState({ kind: 'error', code: 'no_file', message: labels.noFile });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: 'error', code: 'too_large', message: labels.tooLarge });
      return;
    }
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      setState({ kind: 'submitting' });
      const result = await importUserDataAction(fd);
      if (result.ok) {
        setState({
          kind: 'success',
          imported: result.imported,
          skipped: result.skipped,
          warnings: result.warnings,
          source: result.source,
        });
        router.refresh();
      } else {
        setState({ kind: 'error', code: result.code, message: result.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
        <input
          id={inputId}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {!file ? (
          <label htmlFor={inputId} className="block cursor-pointer text-sm text-muted-foreground">
            <span className="mb-2 block text-base font-medium text-foreground">
              {labels.dropzone}
            </span>
            <span className="text-xs">{labels.maxSize}</span>
          </label>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{labels.fileChosen}:</span>{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{file.name}</code>
            </p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            <label
              htmlFor={inputId}
              className="inline-block cursor-pointer text-xs text-primary underline"
            >
              {labels.pickAnother}
            </label>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!file || isPending}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? labels.submitting : labels.submit}
      </button>

      {state.kind === 'success' && (
        <output className="block space-y-4 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm">
          <h3 className="text-base font-semibold text-green-700 dark:text-green-300">
            {labels.successTitle}
          </h3>
          <p className="text-xs text-muted-foreground">
            {labels.source}: <SourceLabel source={state.source} labels={labels} />
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <Stat label={labels.lessons} value={state.imported.lessons} />
            <Stat label={labels.labs} value={state.imported.labs} />
            <Stat label={labels.quizAttempts} value={state.imported.quizAttempts} />
            <Stat label={labels.srsCards} value={state.imported.srsCards} />
            <Stat label={labels.achievements} value={state.imported.achievements} />
            <Stat label={labels.activityEvents} value={state.imported.activityEvents} />
          </dl>
          {(state.skipped.lessons.length > 0 ||
            state.skipped.achievements.length > 0 ||
            state.skipped.cards.length > 0) && (
            <SkippedSection skipped={state.skipped} labels={labels} />
          )}
          {state.warnings.length > 0 && (
            <details className="rounded border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs">
              <summary className="cursor-pointer font-medium">
                {labels.warnings} ({state.warnings.length})
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {state.warnings.slice(0, 30).map((w) => (
                  <li key={w.slice(0, 32)}>{w}</li>
                ))}
                {state.warnings.length > 30 && <li>…{state.warnings.length - 30} more</li>}
              </ul>
            </details>
          )}
          <Link href="/settings" className="inline-block text-xs text-primary underline">
            ← {labels.backToSettings}
          </Link>
        </output>
      )}

      {state.kind === 'error' && (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm"
        >
          <h3 className="text-base font-semibold text-red-700 dark:text-red-300">
            {labels.failureTitle}
          </h3>
          <p className="text-muted-foreground">{state.message}</p>
          <p className="text-xs text-muted-foreground">code: {state.code}</p>
          <button
            type="button"
            onClick={() => setState({ kind: 'idle' })}
            className="text-xs text-primary underline"
          >
            {labels.retry}
          </button>
        </div>
      )}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-background p-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold">{value}</dd>
    </div>
  );
}

function SkippedSection({
  skipped,
  labels,
}: {
  skipped: SkippedSummary;
  labels: ImportFormLabels;
}) {
  return (
    <details className="rounded border bg-background p-2 text-xs">
      <summary className="cursor-pointer font-medium">
        {labels.skipped} (
        {skipped.lessons.length + skipped.achievements.length + skipped.cards.length})
      </summary>
      <div className="mt-2 space-y-2 text-muted-foreground">
        {skipped.lessons.length > 0 && <SkipList label={labels.lessons} items={skipped.lessons} />}
        {skipped.achievements.length > 0 && (
          <SkipList label={labels.achievements} items={skipped.achievements} />
        )}
        {skipped.cards.length > 0 && <SkipList label={labels.srsCards} items={skipped.cards} />}
      </div>
    </details>
  );
}

function SkipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium text-foreground">
        {label} ({items.length})
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {items.slice(0, 10).map((id) => (
          <li key={id}>
            <code className="text-[10px]">{id}</code>
          </li>
        ))}
        {items.length > 10 && <li>…{items.length - 10} more</li>}
      </ul>
    </div>
  );
}

function SourceLabel({
  source,
  labels,
}: {
  source: string;
  labels: ImportFormLabels;
}) {
  switch (source) {
    case 'redlab-v6':
      return <span>{labels.sourceRedlab}</span>;
    case 'sprint-l2':
      return <span>{labels.sourceSprintL2}</span>;
    case 'academy':
      return <span>{labels.sourceAcademy}</span>;
    default:
      return <span>{labels.sourceUnknown}</span>;
  }
}
