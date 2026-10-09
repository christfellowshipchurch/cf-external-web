import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import ShareMySkillsForm from '../share-my-skills-form.component';

vi.mock('~/lib/gtm', () => ({ pushFormEvent: vi.fn() }));

import { pushFormEvent } from '~/lib/gtm';

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
      <ShareMySkillsForm onSuccess={onSuccess} />
    </MemoryRouter>,
  );
}

describe('ShareMySkillsForm', () => {
  beforeEach(() => {
    mockFetcherState = { state: 'idle', data: undefined };
    vi.clearAllMocks();
  });

  it("renders the 'Share My Skills' heading", () => {
    renderForm();
    expect(screen.getByText('Share My Skills')).toBeInTheDocument();
  });

  it('renders First Name, Last Name, Campus, Phone, Email fields', () => {
    renderForm();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Campus Location')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders all five skills and interests checkboxes', () => {
    renderForm();
    expect(screen.getByText('Hospitality experience')).toBeInTheDocument();
    expect(screen.getByText('Culinary experience')).toBeInTheDocument();
    expect(screen.getByText('Driving experience')).toBeInTheDocument();
    expect(screen.getByText('Construction experience')).toBeInTheDocument();
    expect(screen.getByText('Warehouse experience')).toBeInTheDocument();
  });

  it('renders the optional Skills textarea', () => {
    renderForm();
    expect(
      screen.getByText('Share more about your skills and interests'),
    ).toBeInTheDocument();
  });

  it('renders the Campus select with placeholder', () => {
    renderForm();
    expect(screen.getByText('Select a Campus')).toBeInTheDocument();
  });

  it('renders Submit button', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it("calls fetcher.load('/share-my-skills') on mount", () => {
    renderForm();
    expect(mockLoad).toHaveBeenCalledWith('/share-my-skills');
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

  it("shows 'Loading...' on submit button when submitting", () => {
    mockFetcherState = { state: 'submitting', data: undefined };
    renderForm();
    expect(
      screen.getByRole('button', { name: /loading/i }),
    ).toBeInTheDocument();
  });

  it('disables the submit button when loading', () => {
    mockFetcherState = { state: 'submitting', data: undefined };
    renderForm();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });

  it('shows server error message from fetcher data', () => {
    mockFetcherState = {
      state: 'idle',
      data: { error: 'Something went wrong' },
    };
    renderForm();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows inline validation error when submitting with no skills checked', () => {
    renderForm();
    const form = document.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(
      screen.getByText('Please select at least one skill or interest'),
    ).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('does not show skills error when at least one checkbox is checked', () => {
    renderForm();
    const hospitality = document.querySelector(
      "input[name='skillsInterests_1']",
    ) as HTMLInputElement;
    fireEvent.click(hospitality);
    const form = document.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(
      screen.queryByText('Please select at least one skill or interest'),
    ).not.toBeInTheDocument();
  });

  it('calls pushFormEvent form_complete before onSuccess on success', () => {
    const onSuccess = vi.fn();
    const callOrder: string[] = [];
    vi.mocked(pushFormEvent).mockImplementation(() => {
      callOrder.push('gtm');
    });
    onSuccess.mockImplementation(() => {
      callOrder.push('onSuccess');
    });

    mockFetcherState = {
      state: 'idle',
      data: { success: true },
    };

    renderForm(onSuccess);

    expect(pushFormEvent).toHaveBeenCalledWith(
      'form_complete',
      'share_my_skills',
      'Share My Skills',
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['gtm', 'onSuccess']);
  });

  it('checkboxes submit correct numeric values', () => {
    renderForm();
    const checkbox = document.querySelector(
      "input[name='skillsInterests_3']",
    ) as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.value).toBe('3');
  });
});
