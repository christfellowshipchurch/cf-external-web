import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import PrayerRequestForm from '../prayer-request-form.component';

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

function renderForm(onSuccess = vi.fn()) {
  return render(
    <MemoryRouter>
      <PrayerRequestForm onSuccess={onSuccess} />
    </MemoryRouter>,
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: 'Ada' },
  });
  fireEvent.change(screen.getByLabelText('Last Name'), {
    target: { value: 'Lovelace' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Mobile Phone'), {
    target: { value: '5615551234' },
  });
  fireEvent.change(screen.getByLabelText('Campus'), {
    target: { value: 'guid-1' },
  });
  fireEvent.change(screen.getByLabelText('How can we pray for you?'), {
    target: { value: 'Please pray for my family.' },
  });
}

describe('PrayerRequestForm', () => {
  beforeEach(() => {
    mockFetcherState = { state: 'idle', data: undefined };
    vi.clearAllMocks();
  });

  it('renders prayer request fields', () => {
    renderForm();

    expect(screen.getByText('Prayer Request')).toBeInTheDocument();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Mobile Phone')).toBeInTheDocument();
    expect(screen.getByText('Campus')).toBeInTheDocument();
    expect(screen.getByText('How can we pray for you?')).toBeInTheDocument();
    expect(
      screen.getByText('Would you like our team to follow up with you?'),
    ).toBeInTheDocument();
  });

  it('renders follow up options with a blank default option', () => {
    renderForm();

    expect(screen.getByText('Select one...')).toBeInTheDocument();
    expect(screen.getByText('Yes - Text Message')).toBeInTheDocument();
    expect(screen.getByText('Yes - Phone Call')).toBeInTheDocument();
    expect(screen.getByText('Yes - Email')).toBeInTheDocument();
    expect(screen.getByText('No Thank You')).toBeInTheDocument();
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

  it("calls fetcher.load('/prayer-request') on mount", () => {
    renderForm();

    expect(mockLoad).toHaveBeenCalledWith('/prayer-request');
  });

  it('submits to the prayer request route', () => {
    mockFetcherState = {
      state: 'idle',
      data: {
        campuses: [{ guid: 'guid-1', name: 'Palm Beach Gardens' }],
      },
    };
    renderForm();

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
      method: 'post',
      action: '/prayer-request',
    });
  });

  it('fires GTM event before onSuccess and passes submitted first name', () => {
    const onSuccess = vi.fn();
    mockFetcherState = {
      state: 'idle',
      data: {
        campuses: [{ guid: 'guid-1', name: 'Palm Beach Gardens' }],
      },
    };
    const { rerender } = renderForm(onSuccess);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    mockFetcherState = {
      state: 'idle',
      data: { success: true },
    };

    rerender(
      <MemoryRouter>
        <PrayerRequestForm onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    expect(pushFormEvent).toHaveBeenCalledWith(
      'form_complete',
      'prayer_request',
      'Prayer Request',
    );
    expect(onSuccess).toHaveBeenCalledWith('Ada');
    expect(vi.mocked(pushFormEvent).mock.invocationCallOrder[0]).toBeLessThan(
      onSuccess.mock.invocationCallOrder[0],
    );
  });
});
