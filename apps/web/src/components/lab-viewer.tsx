'use client';

import { LabTerminal } from '@/components/lab-terminal';
import { Link } from '@/components/link';
import type { Lab } from '@academy/content';
import { Card, CardContent, CardHeader, CardTitle } from '@academy/ui';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Code-split: the SVG renderer only runs where a topology exists.
const TopologyDiagram = dynamic(
  () => import('@/components/topology-diagram').then((m) => m.TopologyDiagram),
  { loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" /> },
);

export interface LabViewerProps {
  courseSlug: string;
  unitSlug: string;
  lab: Lab;
}

export function LabViewer({ courseSlug, unitSlug, lab }: LabViewerProps) {
  const t = useTranslations('courseBrowser');
  const [showSteps, setShowSteps] = useState(false);

  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b pb-6">
        <p className="text-sm text-muted-foreground">
          <Link href={`/courses/${courseSlug}/units/${unitSlug}`} className="hover:underline">
            {t('backToUnit')}
          </Link>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{lab.title}</h1>
        <p className="text-muted-foreground">{lab.objective}</p>
      </header>

      {/* Network Topology Diagram */}
      {lab.topology && lab.topology.devices.length > 0 ? (
        <TopologyDiagram topology={lab.topology} />
      ) : null}

      {/* Interactive Terminal */}
      <section>
        <LabTerminal labId={lab.id} title={lab.title} objective={lab.objective} steps={lab.steps} />
      </section>

      {/* Definition of done */}
      {lab.validation ? (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">✅ {t('doneCriteria')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{lab.validation}</CardContent>
        </Card>
      ) : null}

      {/* Collapsible reference steps */}
      <section>
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className={`transform transition-transform ${showSteps ? 'rotate-90' : ''}`}>
            ▶
          </span>
          {showSteps ? t('hideSteps') : t('showSteps')}
        </button>
        {showSteps && (
          <ol className="mt-3 space-y-3">
            {lab.steps.map((step, i) => (
              <li key={`${lab.id}-step-${i}`}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {i + 1}. {step.instruction}
                    </CardTitle>
                  </CardHeader>
                  {step.expectedCommand || step.hint ? (
                    <CardContent className="space-y-2 text-sm">
                      {step.expectedCommand ? (
                        <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
                          <code>{step.expectedCommand}</code>
                        </pre>
                      ) : null}
                      {step.hint ? (
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Hint:</span> {step.hint}
                        </p>
                      ) : null}
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
