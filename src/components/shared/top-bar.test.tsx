import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('renders project name and supervisor name', () => {
    render(<TopBar projectName="Mail Processing" supervisorName="Diane Alcorn" />);

    expect(screen.getByText('Mail Processing')).toBeInTheDocument();
    expect(screen.getByText('Diane Alcorn')).toBeInTheDocument();
  });

  it('renders brand text', () => {
    render(<TopBar projectName="Test" supervisorName="User" />);

    expect(screen.getByText('chat2chart')).toBeInTheDocument();
  });

  it('renders initials avatar', () => {
    render(<TopBar projectName="Test" supervisorName="Diane Alcorn" />);

    expect(screen.getByText('DA')).toBeInTheDocument();
  });
});
