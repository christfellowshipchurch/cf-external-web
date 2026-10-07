import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import { FooterColumnComponent } from './footer-column.component';
import { footerColumns } from './footer-data';
import {
  CONSENT_POLICY_VERSION,
  CookieConsentProvider,
} from '~/providers/cookie-consent-provider';

vi.mock('~/components', () => ({
  ConnectCardModal: ({ buttonTitle }: { buttonTitle?: string }) => (
    <button>{buttonTitle}</button>
  ),
  NewsletterSubscriptionModal: ({ buttonTitle }: { buttonTitle?: string }) => (
    <button data-testid='newsletter-subscription-modal'>{buttonTitle}</button>
  ),
  PrayerRequestModal: ({ buttonTitle }: { buttonTitle?: string }) => (
    <button>{buttonTitle}</button>
  ),
}));

vi.mock('~/lib/load-clarity', () => ({
  loadClarity: vi.fn(),
  setClarityConsent: vi.fn(),
}));

function renderWithProviders(ui: ReactNode) {
  return render(
    <MemoryRouter>
      <CookieConsentProvider>{ui}</CookieConsentProvider>
    </MemoryRouter>,
  );
}

describe('FooterColumnComponent', () => {
  it('renders Subscribe to Updates as the newsletter subscription modal trigger', () => {
    const connectColumn = footerColumns.find(
      (column) => column.title === 'Connect',
    );

    expect(connectColumn).toBeDefined();
    renderWithProviders(<FooterColumnComponent column={connectColumn!} />);

    expect(
      screen.getByTestId('newsletter-subscription-modal'),
    ).toHaveTextContent('Subscribe to Updates');
    expect(
      screen.queryByRole('link', { name: /subscribe to updates/i }),
    ).not.toBeInTheDocument();
  });

  it('renders Cookie Settings as a button that opens consent', () => {
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookieConsentVersion', CONSENT_POLICY_VERSION);
    const aboutColumn = footerColumns.find(
      (column) => column.title === 'About',
    );

    expect(aboutColumn).toBeDefined();
    renderWithProviders(<FooterColumnComponent column={aboutColumn!} />);

    const cookieSettings = screen.getByRole('button', {
      name: 'Cookie Settings',
    });
    expect(cookieSettings).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /cookie settings/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(cookieSettings);
    expect(
      screen.getByRole('dialog', { name: /cookie settings/i }),
    ).toBeInTheDocument();
  });
});
