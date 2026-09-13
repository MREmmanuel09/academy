import { ProgressBar } from '@/components/progress-bar';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ProgressBar', () => {
  it('renders a progressbar with the correct aria-valuenow', () => {
    render(<ProgressBar value={42} ariaLabel="Lesson progress" />);
    const bar = screen.getByRole('progressbar', { name: /lesson progress/i });
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values above 100 to 100', () => {
    render(<ProgressBar value={150} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps values below 0 to 0', () => {
    render(<ProgressBar value={-10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows the percentage when showLabel is true and value > 12', () => {
    render(<ProgressBar value={50} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides the percentage when value is too small', () => {
    render(<ProgressBar value={5} showLabel />);
    expect(screen.queryByText('5%')).not.toBeInTheDocument();
  });
});
