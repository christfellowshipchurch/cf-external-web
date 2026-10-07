import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import NewsletterSubscriptionForm from '../newsletter-subscription-form.component';

vi.mock('~/lib/gtm', () => ({ pushFormEvent: vi.fn() }));

let mockFetcherState = {
  state: 'idle' as 'idle' | 'submitting' | 'loading',
  data: undefined as unknown,
};
const mockLoad = vi.fn();
const mockSubmit = vi.fn();

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useFetcher: () => ({
      state: mockFetcherState.state,
      data: mockFetcherState.data,
      load: mockLoad,
      submit: mockSubmit,
    }),
  };
});

function renderForm(onSuccess = vi.fn(), initialEmail?: string) {
  return render(
    <MemoryRouter>
      <NewsletterSubscriptionForm
        onSuccess={onSuccess}
        initialEmail={initialEmail}
      />
    </MemoryRouter>,
  );
}

describe('NewsletterSubscriptionForm', () => {
  beforeEach(() => {
    mockFetcherState = { state: 'idle', data: undefined };
    vi.clearAllMocks();
  });

  it('renders newsletter subscription fields', () => {
    renderForm();

    expect(screen.getByText('Subscribe to Updates')).toBeInTheDocument();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Campus Location')).toBeInTheDocument();
    expect(screen.getByText('Select a Campus')).toBeInTheDocument();
  });

  it('shows campuses in select when fetcher data loads', () => {
    mockFetcherState = {
      state: 'idle',
      data: {
        campuses: [
          { guid: 'guid-1', name: 'Palm Beach Gardens' },
          { guid: 'guid-2', name: 'Stuart' },
        ],
      },
    };

    renderForm();

    expect(screen.getByText('Palm Beach Gardens')).toBeInTheDocument();
    expect(screen.getByText('Stuart')).toBeInTheDocument();
  });

  it('shows Loading... on submit button when submitting', () => {
    mockFetcherState = { state: 'submitting', data: undefined };

    renderForm();

    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows error message from fetcher data', () => {
    mockFetcherState = {
      state: 'idle',
      data: { error: 'Something went wrong' },
    };

    renderForm();

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls fetcher.load on mount', () => {
    renderForm();

    expect(mockLoad).toHaveBeenCalledWith('/newsletter-subscription');
  });

  it('renders the terms and sms consent checkbox', () => {
    renderForm();

    expect(
      screen.getByRole('checkbox', {
        name: /by submitting, you agree to our terms of use and privacy policy/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute(
      'href',
      'https://www.christfellowship.church/terms-of-use',
    );
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }),
    ).toHaveAttribute(
      'href',
      'https://www.christfellowship.church/privacy-policy',
    );
  });

  it('prefills the email field when initialEmail is provided', () => {
    renderForm(vi.fn(), 'reader@example.com');

    expect(screen.getByLabelText('Email Address')).toHaveValue(
      'reader@example.com',
    );
  });

  it('fires the GTM event before calling onSuccess after a successful submission', () => {
    const onSuccess = vi.fn();
    mockFetcherState = {
      state: 'idle',
      data: { success: true },
    };

    renderForm(onSuccess);

    expect(pushFormEvent).toHaveBeenCalledWith(
      'form_complete',
      'newsletter_subscription',
      'Newsletter Subscription',
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(vi.mocked(pushFormEvent).mock.invocationCallOrder[0]).toBeLessThan(
      onSuccess.mock.invocationCallOrder[0],
    );
  });
});
