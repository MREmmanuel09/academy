import { DueCountBadge } from '@/components/due-count-badge';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the server action so we don't hit the DB.
vi.mock('@/app/actions/srs', () => ({
  countDueCardsAction: vi.fn().mockResolvedValue({ count: 5 }),
}));

describe('DueCountBadge', () => {
  it('renders the count returned by the action', async () => {
    render(<DueCountBadge />);
    await waitFor(() => {
      expect(screen.getByText('5 due')).toBeInTheDocument();
    });
  });
});
