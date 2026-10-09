import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import DreamTeamKickoffForm, {
  DreamTeamKickoffSuccessDetails,
} from '../dream-team-kickoff-form.component';
import { pushFormEvent } from '~/lib/gtm';

vi.mock('~/lib/gtm', () => ({ pushFormEvent: vi.fn() }));

let mockSubmitFetcherState = {
  state: 'idle' as 'idle' | 'submitting' | 'loading',
  data: undefined as unknown,
};
let mockCampusesFetcherState = {
  state: 'idle' as 'idle' | 'submitting' | 'loading',
  data: {
    campuses: [
      { guid: 'campus-guid-1', name: 'Palm Beach Gardens' },
      { guid: 'campus-guid-2', name: 'Royal Palm Beach' },
    ],
  } as unknown,
};
const mockLoad = vi.fn();
const mockSubmit = vi.fn();

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useFetcher: vi.fn((options?: { key?: string }) => {
      if (options?.key === 'dream-team-kickoff-campuses') {
        return {
          state: mockCampusesFetcherState.state,
          data: mockCampusesFetcherState.data,
          load: mockLoad,
          submit: mockSubmit,
        };
      }

      return {
        state: mockSubmitFetcherState.state,
        data: mockSubmitFetcherState.data,
        load: mockLoad,
        submit: mockSubmit,
      };
    }),
  };
});

function renderForm({
  onSuccess = vi.fn(),
  initialEntry = '/dream-team-kickoff',
  groupGuid,
}: {
  onSuccess?: (details?: DreamTeamKickoffSuccessDetails) => void;
  initialEntry?: string;
  groupGuid?: string;
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DreamTeamKickoffForm onSuccess={onSuccess} groupGuid={groupGuid} />
    </MemoryRouter>,
  );
}

describe('DreamTeamKickoffForm', () => {
  beforeEach(() => {
    mockSubmitFetcherState = { state: 'idle', data: undefined };
    mockCampusesFetcherState = {
      state: 'idle',
      data: {
        campuses: [
          { guid: 'campus-guid-1', name: 'Palm Beach Gardens' },
          { guid: 'campus-guid-2', name: 'Royal Palm Beach' },
        ],
      },
    };
    vi.clearAllMocks();
  });

  it('renders all requested form fields and static link text', () => {
    renderForm();

    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Cell Phone')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Campus Location')).toBeInTheDocument();
    expect(screen.getByText('Birthdate')).toBeInTheDocument();
    expect(
      screen.getByText('Have you completed the Journey?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Have you filled out a Volunteer Application?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Want to explore what you can be a part of/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'here' })).toHaveAttribute(
      'href',
      'https://www.christfellowship.church/volunteer#church',
    );
    expect(
      screen.getByText('Are you actively serving on a Dream Team?'),
    ).toBeInTheDocument();
  });

  it('renders campus options with campus guid values', () => {
    renderForm();

    const campusSelect = document.querySelector(
      "select[name='Campus']",
    ) as HTMLSelectElement;

    expect(campusSelect).toBeInTheDocument();
    expect(campusSelect.required).toBe(true);
    expect(screen.getByText('Palm Beach Gardens')).toBeInTheDocument();
    expect(screen.getByText('Royal Palm Beach')).toBeInTheDocument();
    expect(campusSelect.options[1].value).toBe('campus-guid-1');
    expect(campusSelect.options[2].value).toBe('campus-guid-2');
  });

  it('renders yes/no dropdowns with numeric values', () => {
    renderForm();

    const completedJourneySelect = document.querySelector(
      "select[name='CompletedJourney']",
    ) as HTMLSelectElement;
    const filledOutApplicationSelect = document.querySelector(
      "select[name='FilledOutApplication']",
    ) as HTMLSelectElement;
    const activeOnDreamTeamSelect = document.querySelector(
      "select[name='ActiveOnDreamTeam']",
    ) as HTMLSelectElement;

    [
      completedJourneySelect,
      filledOutApplicationSelect,
      activeOnDreamTeamSelect,
    ].forEach((select) => {
      expect(select).toBeInTheDocument();
      expect(select.required).toBe(true);
      expect(select.options[1].value).toBe('1');
      expect(select.options[1].text).toBe('Yes');
      expect(select.options[2].value).toBe('2');
      expect(select.options[2].text).toBe('No');
    });
  });

  it('loads campuses on mount', () => {
    renderForm();
    expect(mockLoad).toHaveBeenCalledWith('/dream-team-kickoff');
  });

  it('shows Loading... and disables submit while submitting', () => {
    mockSubmitFetcherState = { state: 'submitting', data: undefined };
    renderForm();

    const button = screen.getByRole('button', {
      name: /loading/i,
    }) as HTMLButtonElement;
    expect(button).toBeInTheDocument();
    expect(button.disabled).toBe(true);
  });

  it('shows error message from fetcher data', () => {
    mockSubmitFetcherState = {
      state: 'idle',
      data: { error: 'Something went wrong' },
    };

    renderForm();

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('fires pushFormEvent before onSuccess when submission succeeds', () => {
    const calls: string[] = [];
    vi.mocked(pushFormEvent).mockImplementation(() => {
      calls.push('pushFormEvent');
    });
    const onSuccess = vi.fn(() => {
      calls.push('onSuccess');
    });
    mockSubmitFetcherState = { state: 'idle', data: { success: true } };

    renderForm({ onSuccess });

    expect(pushFormEvent).toHaveBeenCalledWith(
      'form_complete',
      'dream_team_kickoff',
      'Dream Team Kickoff Sign Up',
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(calls).toEqual(['pushFormEvent', 'onSuccess']);
  });

  it('passes the submitted name to onSuccess after submission succeeds', () => {
    const onSuccess = vi.fn();
    const view = renderForm({ onSuccess });

    fireEvent.change(document.querySelector("input[name='FirstName']")!, {
      target: { value: 'Test' },
    });
    fireEvent.change(document.querySelector("input[name='LastName']")!, {
      target: { value: 'Person' },
    });
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    mockSubmitFetcherState = { state: 'idle', data: { success: true } };
    view.rerender(
      <MemoryRouter initialEntries={['/dream-team-kickoff']}>
        <DreamTeamKickoffForm onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    expect(onSuccess).toHaveBeenCalledWith({
      firstName: 'Test',
      lastName: 'Person',
    });
  });

  it('submits with the groupGuid prop when provided', () => {
    renderForm({
      initialEntry: '/dream-team-kickoff?Group=query-guid-123',
      groupGuid: 'prop-guid-456',
    });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
      method: 'post',
      action: '/dream-team-kickoff?Group=prop-guid-456',
    });
  });

  it('submits with the Group query param when no groupGuid prop is provided', () => {
    renderForm({
      initialEntry: '/dream-team-kickoff?Group=query-guid-123',
    });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
      method: 'post',
      action: '/dream-team-kickoff?Group=query-guid-123',
    });
  });

  it('submits standalone forms without a Group query param', () => {
    renderForm();

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData), {
      method: 'post',
      action: '/dream-team-kickoff',
    });
  });
});
