import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { pushFormEvent } from '~/lib/gtm';
import HelpMeFindAGroupForm from '../help-me-find-a-group-form.component';

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

const mockCampuses = [
  { guid: 'campus-guid-1', name: 'Palm Beach Gardens' },
  { guid: 'campus-guid-2', name: 'Stuart' },
];

const mockHubs = [
  { guid: 'hub-guid-1', value: 'Crew (Men)' },
  { guid: 'hub-guid-2', value: 'Sisterhood' },
];

function renderForm(onSuccess = vi.fn()) {
  return render(
    <MemoryRouter>
      <HelpMeFindAGroupForm onSuccess={onSuccess} />
    </MemoryRouter>,
  );
}

function loadFormData() {
  mockFetcherState = {
    state: 'idle',
    data: {
      campuses: mockCampuses,
      hubs: mockHubs,
    },
  };
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: 'Ada' },
  });
  fireEvent.change(screen.getByLabelText('Last Name'), {
    target: { value: 'Lovelace' },
  });
  fireEvent.change(screen.getByLabelText('Campus'), {
    target: { value: 'campus-guid-1' },
  });
  fireEvent.change(screen.getByLabelText('Phone'), {
    target: { value: '5615551234' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.click(screen.getByLabelText('In Person'));
  fireEvent.click(screen.getByLabelText('Crew (Men)'));
}

describe('HelpMeFindAGroupForm', () => {
  beforeEach(() => {
    mockFetcherState = { state: 'idle', data: undefined };
    vi.clearAllMocks();
  });

  it("calls fetcher.load('/api/help-me-find-a-group') on mount", () => {
    renderForm();

    expect(mockLoad).toHaveBeenCalledWith('/api/help-me-find-a-group');
  });

  it('renders campus select options from loader data', () => {
    loadFormData();
    renderForm();

    expect(screen.getByText('Palm Beach Gardens')).toBeInTheDocument();
    expect(screen.getByText('Stuart')).toBeInTheDocument();
  });

  it('renders hub checkbox labels from loader data', () => {
    loadFormData();
    renderForm();

    expect(screen.getByLabelText('Crew (Men)')).toBeInTheDocument();
    expect(screen.getByLabelText('Sisterhood')).toBeInTheDocument();
  });

  it('submits selected Hub checkboxes under the shared Hub field name', () => {
    loadFormData();
    renderForm();

    fillRequiredFields();
    fireEvent.click(screen.getByLabelText('Sisterhood'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
      method: 'post',
      action: '/api/help-me-find-a-group',
    });

    const submittedFormData = mockSubmit.mock.calls[0][0] as FormData;
    expect(submittedFormData.getAll('Hub')).toEqual([
      'hub-guid-1',
      'hub-guid-2',
    ]);
  });

  it('shows server error message from fetcher data', () => {
    mockFetcherState = {
      state: 'idle',
      data: { error: 'Something went wrong' },
    };

    renderForm();

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows client error when no Hub is selected', () => {
    loadFormData();
    renderForm();

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Ada' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Lovelace' },
    });
    fireEvent.change(screen.getByLabelText('Campus'), {
      target: { value: 'campus-guid-1' },
    });
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '5615551234' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(screen.getByLabelText('In Person'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(
      screen.getByText('Please select at least one area.'),
    ).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('fires GTM completion event and calls onSuccess after successful submission', () => {
    const onSuccess = vi.fn();
    loadFormData();
    const { rerender } = renderForm(onSuccess);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    mockFetcherState = {
      state: 'idle',
      data: { success: true },
    };

    rerender(
      <MemoryRouter>
        <HelpMeFindAGroupForm onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    expect(pushFormEvent).toHaveBeenCalledWith(
      'form_complete',
      'help_me_find_a_group',
      'Help Me Find a Group',
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(vi.mocked(pushFormEvent).mock.invocationCallOrder[0]).toBeLessThan(
      onSuccess.mock.invocationCallOrder[0],
    );
  });
});
