import { TopologyDiagram } from '@/components/topology-diagram';
import type { Topology } from '@academy/content/loader';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const simpleTopology: Topology = {
  devices: [
    { type: 'router', name: 'R1', x: 100, y: 100 },
    { type: 'switch', name: 'SW1', x: 300, y: 100 },
    { type: 'pc', name: 'PC1', x: 500, y: 100 },
  ],
  links: [
    { from: 'R1', to: 'SW1', label: 'Gig0/1' },
    { from: 'SW1', to: 'PC1' },
  ],
};

describe('TopologyDiagram', () => {
  it('renders SVG with devices', () => {
    render(<TopologyDiagram topology={simpleTopology} />);
    expect(screen.getByText('R1')).toBeDefined();
    expect(screen.getByText('SW1')).toBeDefined();
    expect(screen.getByText('PC1')).toBeDefined();
  });

  it('renders link labels', () => {
    render(<TopologyDiagram topology={simpleTopology} />);
    expect(screen.getByText('Gig0/1')).toBeDefined();
  });

  it('renders SVG lines for links', () => {
    const { container } = render(<TopologyDiagram topology={simpleTopology} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });

  it('returns null for empty topology', () => {
    const { container } = render(<TopologyDiagram topology={{ devices: [], links: [] }} />);
    expect(container.innerHTML).toBe('');
  });

  it('skips links with missing devices', () => {
    const topo: Topology = {
      devices: [{ type: 'router', name: 'R1', x: 100, y: 100 }],
      links: [{ from: 'R1', to: 'NONEXISTENT' }],
    };
    const { container } = render(<TopologyDiagram topology={topo} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(0);
  });
});
