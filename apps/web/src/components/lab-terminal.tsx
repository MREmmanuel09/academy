'use client';

import { Button } from '@academy/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LabStep {
  instruction: string;
  expectedCommand?: string;
  hint?: string;
}

export interface LabTerminalProps {
  labId: string;
  title: string;
  objective: string;
  steps: LabStep[];
  onComplete?: () => void;
}

interface HistoryEntry {
  type: 'input' | 'output' | 'system' | 'error';
  text: string;
  stepIndex?: number;
}

const WELCOME_MSG = `Welcome to the Academy Lab Terminal.
Type "help" for available commands, "hint" for the current step hint.
`;

const HELP_MSG = `Available commands:
  help      - Show this message
  hint      - Show hint for the current step
  clear     - Clear terminal
  steps     - Show all lab steps
  step      - Show current step instruction
  progress  - Show lab progress
  reset     - Reset progress and start over
  whoami    - Show current user (simulated)`;

function normalizeCommand(cmd: string): string {
  return cmd.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function LabTerminal({ title, objective, steps, onComplete }: LabTerminalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: 'system', text: `Lab: ${title}` },
    { type: 'system', text: `Objective: ${objective}` },
    { type: 'system', text: WELCOME_MSG },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll intentionally on every history entry
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    // preventScroll: focusing must not yank the page past the lab title.
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const addHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [...prev, entry]);
  }, []);

  const checkCommand = useCallback(
    (cmd: string): boolean => {
      if (currentStep >= steps.length) return false;
      const step = steps[currentStep];
      if (!step?.expectedCommand) return true; // No validation needed
      const normalized = normalizeCommand(cmd);
      const expected = normalizeCommand(step.expectedCommand);
      // Allow exact match or prefix match for partial commands
      return normalized === expected || normalized.startsWith(expected);
    },
    [currentStep, steps],
  );

  const advanceStep = useCallback(() => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });

    if (currentStep + 1 >= steps.length) {
      setIsComplete(true);
      addHistory({
        type: 'system',
        text: `\n🎉 Congratulations! You completed all ${steps.length} steps of this lab.`,
      });
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps, addHistory, onComplete]);

  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      addHistory({ type: 'input', text: `$ ${trimmed}` });

      const lower = trimmed.toLowerCase();

      if (lower === 'help') {
        addHistory({ type: 'output', text: HELP_MSG });
        return;
      }
      if (lower === 'clear') {
        setHistory([]);
        return;
      }
      if (lower === 'hint') {
        if (currentStep < steps.length) {
          const hint = steps[currentStep]?.hint;
          addHistory({
            type: 'system',
            text: hint ? `💡 Hint: ${hint}` : 'No hint available for this step.',
          });
        }
        return;
      }
      if (lower === 'step') {
        if (currentStep < steps.length) {
          const step = steps[currentStep];
          if (step) {
            addHistory({ type: 'system', text: `Step ${currentStep + 1}: ${step.instruction}` });
          }
        }
        return;
      }
      if (lower === 'steps') {
        const lines = steps.map(
          (s, i) =>
            `${i + 1}. ${completedSteps.has(i) ? '✅' : i === currentStep ? '👉' : '⬜'} ${s.instruction}`,
        );
        addHistory({ type: 'output', text: lines.join('\n') });
        return;
      }
      if (lower === 'progress') {
        addHistory({
          type: 'system',
          text: `Progress: ${completedSteps.size}/${steps.length} steps completed`,
        });
        return;
      }
      if (lower === 'reset') {
        setCurrentStep(0);
        setCompletedSteps(new Set());
        setIsComplete(false);
        addHistory({ type: 'system', text: 'Lab reset. Starting from step 1.' });
        return;
      }
      if (lower === 'whoami') {
        addHistory({ type: 'output', text: 'student (simulated environment)' });
        return;
      }

      // Check against expected command
      if (currentStep >= steps.length) {
        addHistory({
          type: 'system',
          text: 'All steps already completed. Type "steps" to review.',
        });
        return;
      }

      const currentStepData = steps[currentStep];
      if (!currentStepData) {
        addHistory({ type: 'system', text: 'Invalid step.' });
        return;
      }

      if (!currentStepData.expectedCommand) {
        // No validation — auto-advance
        addHistory({ type: 'output', text: `Step ${currentStep + 1} accepted.` });
        advanceStep();
        return;
      }

      if (checkCommand(trimmed)) {
        addHistory({
          type: 'output',
          text: `✅ Step ${currentStep + 1} completed: ${currentStepData.instruction}`,
        });
        advanceStep();
      } else {
        addHistory({
          type: 'error',
          text: `❌ Command not recognized for step ${currentStep + 1}. Type "hint" for help.`,
        });
      }
    },
    [currentStep, steps, completedSteps, addHistory, checkCommand, advanceStep],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-[hsl(222.2,84%,4.9%)] font-mono text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-2 text-xs text-muted-foreground">lab-terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Step {Math.min(currentStep + 1, steps.length)}/{steps.length}
          </span>
          {isComplete ? (
            <span className="text-xs text-green-400">✓ Complete</span>
          ) : (
            <span className="text-xs text-yellow-400">{completedSteps.size} done</span>
          )}
        </div>
      </div>

      {/* Terminal body: clicking focuses the input (mouse convenience).
          Keyboard users tab straight to the input, so this stays a plain
          non-focusable div by design. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users reach the input directly via Tab */}
      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto p-4 text-[hsl(210,40%,98%)]"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((entry, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only log, entries never reorder
          <div key={i} className="whitespace-pre-wrap">
            {entry.type === 'input' ? (
              <span className="text-green-400">{entry.text}</span>
            ) : entry.type === 'error' ? (
              <span className="text-red-400">{entry.text}</span>
            ) : entry.type === 'system' ? (
              <span className="text-yellow-300/80">{entry.text}</span>
            ) : (
              <span>{entry.text}</span>
            )}
          </div>
        ))}

        {/* Current step instruction */}
        {!isComplete && currentStep < steps.length && steps[currentStep] && (
          <div className="mt-2 rounded border border-primary/30 bg-primary/10 p-2 text-xs text-primary">
            📋 Step {currentStep + 1}: {steps[currentStep].instruction}
          </div>
        )}
      </div>

      {/* Input line */}
      <div className="flex items-center border-t border-border/50 px-4 py-2">
        <span className="mr-2 text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isComplete}
          className="flex-1 bg-transparent text-[hsl(210,40%,98%)] outline-none placeholder:text-muted-foreground"
          placeholder={isComplete ? 'Lab completed!' : 'Type a command...'}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 border-t border-border/50 px-4 py-2">
        {!isComplete && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                if (currentStep < steps.length) {
                  const hint = steps[currentStep]?.hint;
                  addHistory({
                    type: 'system',
                    text: hint ? `💡 Hint: ${hint}` : 'No hint available.',
                  });
                }
              }}
            >
              💡 Hint
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                addHistory({
                  type: 'output',
                  text: steps
                    .map(
                      (s, i) =>
                        `${i + 1}. ${completedSteps.has(i) ? '✅' : i === currentStep ? '👉' : '⬜'} ${s.instruction}`,
                    )
                    .join('\n'),
                });
              }}
            >
              📋 Steps
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setCurrentStep(0);
                setCompletedSteps(new Set());
                setIsComplete(false);
                addHistory({ type: 'system', text: 'Lab reset.' });
              }}
            >
              🔄 Reset
            </Button>
          </>
        )}
        {isComplete && (
          <div className="flex-1 text-center text-sm text-green-400">
            🎉 Lab completed! All {steps.length} steps done.
          </div>
        )}
      </div>
    </div>
  );
}
