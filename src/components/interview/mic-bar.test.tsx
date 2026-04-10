import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MicBar } from './mic-bar';
import type { MicBarMode } from './mic-bar';

const defaultProps = {
  mode: 'idle' as MicBarMode,
  onStartRecording: vi.fn(),
  onStopRecording: vi.fn(),
  onToggleTextMode: vi.fn(),
  onSendText: vi.fn(),
};

describe('MicBar', () => {
  describe('Idle state', () => {
    it('renders mic button with "Start recording" aria-label', () => {
      render(<MicBar {...defaultProps} mode="idle" />);
      expect(screen.getByLabelText('Start recording')).toBeInTheDocument();
    });

    it('renders "Tap to start" status text', () => {
      render(<MicBar {...defaultProps} mode="idle" />);
      expect(screen.getByText('Tap to start')).toBeInTheDocument();
    });

    it('renders "Prefer to type?" toggle', () => {
      render(<MicBar {...defaultProps} mode="idle" />);
      expect(screen.getByText('Prefer to type?')).toBeInTheDocument();
    });

    it('clicking mic button calls onStartRecording', () => {
      const onStartRecording = vi.fn();
      render(<MicBar {...defaultProps} mode="idle" onStartRecording={onStartRecording} />);
      fireEvent.click(screen.getByLabelText('Start recording'));
      expect(onStartRecording).toHaveBeenCalled();
    });
  });

  describe('Recording state', () => {
    it('renders mic button with "Recording in progress" aria-label', () => {
      render(<MicBar {...defaultProps} mode="recording" />);
      expect(screen.getByLabelText('Recording in progress')).toBeInTheDocument();
    });

    it('renders "Recording..." status text', () => {
      render(<MicBar {...defaultProps} mode="recording" />);
      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });

    it('renders Done button', () => {
      render(<MicBar {...defaultProps} mode="recording" />);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('renders "Prefer to type?" toggle', () => {
      render(<MicBar {...defaultProps} mode="recording" />);
      expect(screen.getByText('Prefer to type?')).toBeInTheDocument();
    });

    it('clicking Done calls onStopRecording', () => {
      const onStopRecording = vi.fn();
      render(<MicBar {...defaultProps} mode="recording" onStopRecording={onStopRecording} />);
      fireEvent.click(screen.getByText('Done'));
      expect(onStopRecording).toHaveBeenCalled();
    });
  });

  describe('Processing state', () => {
    it('renders disabled mic button with "Processing speech" aria-label', () => {
      render(<MicBar {...defaultProps} mode="processing" />);
      const button = screen.getByLabelText('Processing speech');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('renders "Processing..." status text', () => {
      render(<MicBar {...defaultProps} mode="processing" />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('does not render Done button', () => {
      render(<MicBar {...defaultProps} mode="processing" />);
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  describe('Text mode', () => {
    it('renders text input field', () => {
      render(<MicBar {...defaultProps} mode="text" />);
      expect(screen.getByLabelText('Type your response')).toBeInTheDocument();
    });

    it('renders "Back to voice" toggle', () => {
      render(<MicBar {...defaultProps} mode="text" />);
      expect(screen.getByText('Back to voice')).toBeInTheDocument();
    });

    it('does not render mic button', () => {
      render(<MicBar {...defaultProps} mode="text" />);
      expect(screen.queryByLabelText('Start recording')).not.toBeInTheDocument();
    });

    it('typing text and clicking Send calls onSendText with typed text', () => {
      const onSendText = vi.fn();
      render(<MicBar {...defaultProps} mode="text" onSendText={onSendText} />);
      const input = screen.getByLabelText('Type your response');
      fireEvent.change(input, { target: { value: 'my response' } });
      fireEvent.click(screen.getByText('Send'));
      expect(onSendText).toHaveBeenCalledWith('my response');
    });
  });

  describe('Toggle', () => {
    it('clicking "Prefer to type?" calls onToggleTextMode', () => {
      const onToggleTextMode = vi.fn();
      render(<MicBar {...defaultProps} mode="idle" onToggleTextMode={onToggleTextMode} />);
      fireEvent.click(screen.getByText('Prefer to type?'));
      expect(onToggleTextMode).toHaveBeenCalled();
    });
  });

  describe('Completion button', () => {
    it('is hidden when canComplete is false', () => {
      render(<MicBar {...defaultProps} mode="idle" canComplete={false} />);
      expect(screen.queryByText("I'm finished describing my process")).not.toBeInTheDocument();
    });

    it('is visible when canComplete is true and mode is idle', () => {
      render(
        <MicBar {...defaultProps} mode="idle" canComplete={true} onCompleteInterview={vi.fn()} />,
      );
      expect(screen.getByText("I'm finished describing my process")).toBeInTheDocument();
    });

    it('is hidden during recording mode even when canComplete is true', () => {
      render(
        <MicBar
          {...defaultProps}
          mode="recording"
          canComplete={true}
          onCompleteInterview={vi.fn()}
        />,
      );
      expect(screen.queryByText("I'm finished describing my process")).not.toBeInTheDocument();
    });

    it('is hidden during processing mode even when canComplete is true', () => {
      render(
        <MicBar
          {...defaultProps}
          mode="processing"
          canComplete={true}
          onCompleteInterview={vi.fn()}
        />,
      );
      expect(screen.queryByText("I'm finished describing my process")).not.toBeInTheDocument();
    });

    it('is hidden during text mode even when canComplete is true', () => {
      render(
        <MicBar {...defaultProps} mode="text" canComplete={true} onCompleteInterview={vi.fn()} />,
      );
      expect(screen.queryByText("I'm finished describing my process")).not.toBeInTheDocument();
    });

    it('clicking completion button calls onCompleteInterview', () => {
      const onCompleteInterview = vi.fn();
      render(
        <MicBar
          {...defaultProps}
          mode="idle"
          canComplete={true}
          onCompleteInterview={onCompleteInterview}
        />,
      );
      fireEvent.click(screen.getByText("I'm finished describing my process"));
      expect(onCompleteInterview).toHaveBeenCalled();
    });

    it('shows "Wrapping up..." text when isCompleting is true', () => {
      render(
        <MicBar
          {...defaultProps}
          mode="idle"
          canComplete={true}
          isCompleting={true}
          onCompleteInterview={vi.fn()}
        />,
      );
      expect(screen.getByText('Wrapping up...')).toBeInTheDocument();
      expect(screen.queryByText("I'm finished describing my process")).not.toBeInTheDocument();
    });

    it('has correct aria-label for completion button', () => {
      render(
        <MicBar {...defaultProps} mode="idle" canComplete={true} onCompleteInterview={vi.fn()} />,
      );
      expect(
        screen.getByLabelText('End interview and generate process diagram'),
      ).toBeInTheDocument();
    });

    it('has aria-busy when completing', () => {
      render(
        <MicBar
          {...defaultProps}
          mode="idle"
          canComplete={true}
          isCompleting={true}
          onCompleteInterview={vi.fn()}
        />,
      );
      const button = screen.getByLabelText('Generating your process diagram...');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Waveform in MicBar', () => {
    it('renders waveform bars when mode is recording and isRecording is true', () => {
      const { container } = render(
        <MicBar {...defaultProps} mode="recording" isRecording={true} />,
      );
      const waveformSection = screen.getByRole('status');
      expect(waveformSection).toHaveAttribute('aria-label', 'Recording audio — waveform animation');
      // Check 8 waveform bars are present
      const ariaHiddenEls = container.querySelectorAll('[aria-hidden="true"]');
      let barCount = 0;
      ariaHiddenEls.forEach((el) => {
        const children = el.querySelectorAll('div');
        if (children.length === 8) barCount = 8;
      });
      expect(barCount).toBe(8);
    });

    it('does NOT render waveform in idle mode', () => {
      render(<MicBar {...defaultProps} mode="idle" isRecording={false} />);
      expect(screen.queryByText("I'm hearing you...")).not.toBeInTheDocument();
    });

    it('does NOT render waveform in processing mode', () => {
      render(<MicBar {...defaultProps} mode="processing" isRecording={false} />);
      expect(screen.queryByText("I'm hearing you...")).not.toBeInTheDocument();
    });

    it('does NOT render waveform in text mode', () => {
      render(<MicBar {...defaultProps} mode="text" isRecording={false} />);
      expect(screen.queryByText("I'm hearing you...")).not.toBeInTheDocument();
    });

    it('renders pulsing dot and "I\'m hearing you..." text during recording', () => {
      render(<MicBar {...defaultProps} mode="recording" isRecording={true} />);
      expect(screen.getByText("I'm hearing you...")).toBeInTheDocument();
    });

    it('renders "Words appear after Done" helper text during recording', () => {
      render(<MicBar {...defaultProps} mode="recording" isRecording={true} />);
      expect(screen.getByText('Words appear after Done')).toBeInTheDocument();
    });

    it('has role="status" and correct aria-label on waveform section', () => {
      render(<MicBar {...defaultProps} mode="recording" isRecording={true} />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Recording audio — waveform animation');
    });

    it('waveform bars container has aria-hidden="true"', () => {
      const { container } = render(
        <MicBar {...defaultProps} mode="recording" isRecording={true} />,
      );
      const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(ariaHiddenElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has aria-live polite region for status text', () => {
      render(<MicBar {...defaultProps} mode="idle" />);
      const liveRegion = screen.getByText('Tap to start').closest('[aria-live]');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('Space key on mic button triggers start in idle mode', () => {
      const onStartRecording = vi.fn();
      render(<MicBar {...defaultProps} mode="idle" onStartRecording={onStartRecording} />);
      fireEvent.keyDown(screen.getByLabelText('Start recording'), { key: ' ' });
      expect(onStartRecording).toHaveBeenCalled();
    });
  });
});
