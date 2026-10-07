import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CookieConsent } from '../index';
import { describe, it, expect, vi, beforeEach } from 'vitest';

function renderBanner(props: {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return render(
    <MemoryRouter>
      <CookieConsent {...props} />
    </MemoryRouter>,
  );
}

describe('CookieConsent', () => {
  const mockOnAccept = vi.fn();
  const mockOnDecline = vi.fn();

  beforeEach(() => {
    mockOnAccept.mockClear();
    mockOnDecline.mockClear();
  });

  it('renders when visible with analytics-scoped copy and actions', () => {
    renderBanner({
      isVisible: true,
      onAccept: mockOnAccept,
      onDecline: mockOnDecline,
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cookie Settings')).toBeInTheDocument();
    expect(screen.getByText(/optional analytics cookies/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Allow analytics' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reject analytics' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /learn more in our privacy policy/i }),
    ).toHaveAttribute('href', '/privacy-policy');
  });

  it('does not render when not visible', () => {
    renderBanner({
      isVisible: false,
      onAccept: mockOnAccept,
      onDecline: mockOnDecline,
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles accept action correctly without writing localStorage', () => {
    localStorage.clear();
    renderBanner({
      isVisible: true,
      onAccept: mockOnAccept,
      onDecline: mockOnDecline,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));

    expect(localStorage.getItem('cookieConsent')).toBeNull();
    expect(mockOnAccept).toHaveBeenCalledTimes(1);
  });

  it('handles decline action correctly without writing localStorage', () => {
    localStorage.clear();
    renderBanner({
      isVisible: true,
      onAccept: mockOnAccept,
      onDecline: mockOnDecline,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reject analytics' }));

    expect(localStorage.getItem('cookieConsent')).toBeNull();
    expect(mockOnDecline).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes', () => {
    renderBanner({
      isVisible: true,
      onAccept: mockOnAccept,
      onDecline: mockOnDecline,
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'cookie-consent-title');

    const title = screen.getByText('Cookie Settings');
    expect(title).toHaveAttribute('id', 'cookie-consent-title');
  });

  it('gives accept and reject comparable visual prominence', () => {
    renderBanner({
      isVisible: true,
      onAccept: mockOnAccept,
      onDecline: mockOnDecline,
    });

    const allow = screen.getByRole('button', { name: 'Allow analytics' });
    const reject = screen.getByRole('button', { name: 'Reject analytics' });

    expect(allow.className).toBe(reject.className);
  });
});
