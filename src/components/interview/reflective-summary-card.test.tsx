import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReflectiveSummaryCard } from './reflective-summary-card';

const defaultProps = {
  content: 'You mentioned that you scan incoming mail as the first step.',
  summaryState: 'streaming' as const,
  segmentId: 'seg-1',
  onConfirm: vi.fn(),
  onCorrect: vi.fn(),
};

describe('ReflectiveSummaryCard', () => {
  describe('streaming state', () => {
    it('renders label and content, no buttons', () => {
      render(<ReflectiveSummaryCard {...defaultProps} summaryState="streaming" isStreaming />);
      expect(screen.getByText('Reflective Summary')).toBeInTheDocument();
      expect(screen.getByText(/You mentioned that you scan/)).toBeInTheDocument();
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      expect(screen.queryByText("That's not right")).not.toBeInTheDocument();
    });
  });

  describe('awaiting_confirmation state', () => {
    it("shows Confirm and That's not right buttons", () => {
      render(<ReflectiveSummaryCard {...defaultProps} summaryState="awaiting_confirmation" />);
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText("That's not right")).toBeInTheDocument();
    });

    it('Confirm click calls onConfirm with segmentId', () => {
      const onConfirm = vi.fn();
      render(
        <ReflectiveSummaryCard
          {...defaultProps}
          summaryState="awaiting_confirmation"
          onConfirm={onConfirm}
        />,
      );
      fireEvent.click(screen.getByText('Confirm'));
      expect(onConfirm).toHaveBeenCalledWith('seg-1');
    });

    it("That's not right click calls onCorrect with segmentId", () => {
      const onCorrect = vi.fn();
      render(
        <ReflectiveSummaryCard
          {...defaultProps}
          summaryState="awaiting_confirmation"
          onCorrect={onCorrect}
        />,
      );
      fireEvent.click(screen.getByText("That's not right"));
      expect(onCorrect).toHaveBeenCalledWith('seg-1');
    });
  });

  describe('confirmed state', () => {
    it('shows green checkmark badge and no buttons', () => {
      render(<ReflectiveSummaryCard {...defaultProps} summaryState="confirmed" />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      expect(screen.queryByText("That's not right")).not.toBeInTheDocument();
    });

    it('has aria-live="polite" on confirmed badge', () => {
      render(<ReflectiveSummaryCard {...defaultProps} summaryState="confirmed" />);
      const badge = screen.getByText('Confirmed').closest('[aria-live]');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('correction_requested state', () => {
    it('card dims and no buttons', () => {
      const { container } = render(
        <ReflectiveSummaryCard {...defaultProps} summaryState="correction_requested" />,
      );
      const article = container.querySelector('article');
      expect(article?.style.opacity).toBe('0.75');
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('aria-label updates with state', () => {
      const { rerender } = render(
        <ReflectiveSummaryCard {...defaultProps} summaryState="streaming" />,
      );
      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Reflective summary streaming',
      );

      rerender(<ReflectiveSummaryCard {...defaultProps} summaryState="awaiting_confirmation" />);
      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Reflective summary awaiting your confirmation',
      );

      rerender(<ReflectiveSummaryCard {...defaultProps} summaryState="confirmed" />);
      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Reflective summary confirmed',
      );
    });
  });
});
