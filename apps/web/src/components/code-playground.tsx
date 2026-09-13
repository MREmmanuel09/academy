'use client';

import { Button } from '@academy/ui';
import { useCallback, useState } from 'react';

export interface CodePlaygroundProps {
  language: 'python' | 'sql';
  initialCode?: string;
  className?: string;
  height?: number;
}

interface OutputLine {
  type: 'log' | 'error' | 'result';
  content: string;
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<{ runPython: (code: string) => unknown }>;
  }
}

export function CodePlayground({
  language,
  initialCode = '',
  className = '',
  height = 200,
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);

  const runPython = useCallback(async () => {
    setRunning(true);
    setOutput([]);

    try {
      if (!window.loadPyodide) {
        setOutput([
          { type: 'log', content: 'Loading Python runtime (first time may take ~30s)...' },
        ]);
        // Load Pyodide from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide'));
          document.head.appendChild(script);
        });
      }

      const loadPyodide = window.loadPyodide;
      if (!loadPyodide) {
        throw new Error('Pyodide failed to initialise');
      }
      const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });

      // Capture stdout/stderr
      pyodide.runPython(`
import sys
from io import StringIO
_stdout = sys.stdout
_stderr = sys.stderr
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

      let result: unknown;
      try {
        result = pyodide.runPython(code);
      } catch (e) {
        setOutput([{ type: 'error', content: String(e) }]);
        return;
      }

      const stdout = (pyodide.runPython('sys.stdout.getvalue()') as string) ?? '';
      const stderr = (pyodide.runPython('sys.stderr.getvalue()') as string) ?? '';

      pyodide.runPython('sys.stdout = _stdout; sys.stderr = _stderr');

      const lines: OutputLine[] = [];
      if (stdout.trim()) {
        for (const line of stdout.trim().split('\n')) {
          lines.push({ type: 'log', content: line });
        }
      }
      if (stderr.trim()) {
        for (const line of stderr.trim().split('\n')) {
          lines.push({ type: 'error', content: line });
        }
      }
      if (result !== undefined && result !== null && String(result) !== 'None') {
        lines.push({ type: 'result', content: `>>> ${String(result)}` });
      }
      if (lines.length === 0) {
        lines.push({ type: 'log', content: '(no output)' });
      }

      setOutput(lines);
    } catch (e) {
      setOutput([{ type: 'error', content: `Failed to load Python: ${String(e)}` }]);
    } finally {
      setRunning(false);
    }
  }, [code]);

  const runSQL = useCallback(async () => {
    setRunning(true);
    setOutput([]);

    try {
      // SQL preview editor - full DuckDB-Wasm support requires CDN loading
      const lines: OutputLine[] = [
        { type: 'log', content: '-- SQL execution requires DuckDB-Wasm runtime' },
        { type: 'log', content: '-- This is a preview editor. Full SQL support coming soon.' },
        { type: 'result', content: code.trim() },
      ];
      setOutput(lines);
    } catch (e) {
      setOutput([{ type: 'error', content: `Error: ${String(e)}` }]);
    } finally {
      setRunning(false);
    }
  }, [code]);

  const handleRun = () => {
    if (language === 'python') runPython();
    else runSQL();
  };

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              language === 'python'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}
          >
            {language}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleRun}
          disabled={running || !code.trim()}
          className="gap-1.5"
        >
          {running ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Running...
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run
            </>
          )}
        </Button>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full resize-none bg-[hsl(222.2,84%,4.9%)] p-4 font-mono text-sm text-[hsl(210,40%,96%)] outline-none placeholder:text-muted-foreground"
          style={{ height, tabSize: 2 }}
          placeholder={
            language === 'python'
              ? '# Write Python code here...\nprint("Hello, world!")'
              : '-- Write SQL here...\nSELECT 42 AS answer;'
          }
        />
      </div>

      {/* Output */}
      {output.length > 0 && (
        <div className="border-t border-border bg-[hsl(222.2,84%,3.9%)] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Output
          </p>
          <div className="max-h-48 overflow-auto font-mono text-xs">
            {output.map((line, i) => (
              <div
                key={`${line.type}-${i}-${line.content.slice(0, 20)}`}
                className={`whitespace-pre-wrap ${
                  line.type === 'error'
                    ? 'text-red-400'
                    : line.type === 'result'
                      ? 'text-green-400'
                      : 'text-[hsl(210,40%,80%)]'
                }`}
              >
                {line.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
