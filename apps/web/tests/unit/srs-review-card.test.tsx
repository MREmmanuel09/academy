import { SrsReviewCard } from '@/components/srs-review-card';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

// Mock the server action.
vi.mock('@/app/actions/srs', () => ({
  reviewSrsCardAction: vi.fn().mockResolvedValue({
    ok: true,
    newState: { state: 'review', due: '2026-01-20T00:00:00.000Z' },
    nextDue: '2026-01-20T00:00:00.000Z',
    xpAwarded: 1,
  }),
}));

const messages = {
  srs: {
    reviewing: 'Reviewing',
    showAnswer: 'Show answer',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    cardTypeLesson: 'Lesson',
    cardTypeVocab: 'Vocabulary',
    cardTypeRoleplay: 'Roleplay',
    cardTypeEpisode: 'Episode',
  },
};

const renderWithI18n = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

describe('SrsReviewCard', () => {
  it('shows the front and reveal button initially', () => {
    renderWithI18n(
      <SrsReviewCard
        card={{ id: 'c1', cardType: 'vocab', contentId: 'v1' }}
        front="hello"
        back="hola"
        onReviewed={() => {}}
      />,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show answer/i })).toBeInTheDocument();
  });

  it('reveals the back and rating buttons on click', async () => {
    const user = userEvent.setup();
    const onReviewed = vi.fn();
    renderWithI18n(
      <SrsReviewCard
        card={{ id: 'c1', cardType: 'vocab', contentId: 'v1' }}
        front="hello"
        back="hola"
        onReviewed={onReviewed}
      />,
    );
    await user.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('hola')).toBeInTheDocument();
    for (const r of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(screen.getByRole('button', { name: r })).toBeInTheDocument();
    }
  });

  it('calls onReviewed after a rating is chosen', async () => {
    const user = userEvent.setup();
    const onReviewed = vi.fn();
    renderWithI18n(
      <SrsReviewCard
        card={{ id: 'c1', cardType: 'vocab', contentId: 'v1' }}
        front="hello"
        back="hola"
        onReviewed={onReviewed}
      />,
    );
    await user.click(screen.getByRole('button', { name: /show answer/i }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(onReviewed).toHaveBeenCalledTimes(1);
    expect(onReviewed.mock.calls[0]?.[1]).toBe(1); // xpAwarded
  });
});
