import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';
import type {
  JourneySessionNumber,
  JourneySessionOption,
  JourneySessionSelection,
} from '~/lib/journey-sessions';
import { PlanYourJourneyStep } from './plan-your-journey-step.component';
import { JourneyConfirmation } from './journey-confirmation.component';
import { YourInformationStep } from './your-information-step.component';

const campuses = [
  {
    id: 2,
    name: 'Palm Beach Gardens',
    street1: '5343 Northlake Blvd',
    city: 'Palm Beach Gardens',
  },
  { id: 14, name: 'Jupiter', street1: '1200 W Indiantown Rd', city: 'Jupiter' },
];

const opt = (
  sessionNumber: JourneySessionNumber,
  startsAt: string,
  extra: Partial<JourneySessionOption> = {},
): JourneySessionOption => ({
  sessionNumber,
  startsAt,
  groupGuid: `g-${sessionNumber}-${startsAt}`,
  campusId: 2,
  isFull: false,
  isPast: false,
  offersChildcare: false,
  ...extra,
});

const options = [
  opt(1, '2026-09-27T09:00', { isPast: true }),
  opt(1, '2026-10-04T09:00'),
  opt(1, '2026-10-04T11:00'),
  opt(2, '2026-10-11T09:00', { isFull: true }),
  opt(2, '2026-10-11T11:00'),
  opt(3, '2026-10-18T09:00'),
  opt(3, '2026-10-25T09:00', { campusId: 14 }),
  // December-style group: Sessions 2 and 3 back to back on one day.
  opt(2, '2026-12-13T09:45', { groupGuid: 'dec' }),
  opt(3, '2026-12-13T10:45', { groupGuid: 'dec' }),
  // Another group's Session 3 on that day: a coincidence, not back to back.
  opt(3, '2026-12-13T18:00', { groupGuid: 'other' }),
];

const Harness = ({
  registered = {},
}: {
  registered?: JourneySessionSelection;
}) => {
  const [selection, setSelection] = useState<JourneySessionSelection>({});
  return (
    <PlanYourJourneyStep
      campuses={campuses}
      options={options}
      preferredCampusId={2}
      selection={selection}
      registered={registered}
      onChangePreferredCampus={vi.fn()}
      onSelect={(n, option) =>
        setSelection((prev) => ({ ...prev, [n]: option }))
      }
      onSelectEarliest={vi.fn()}
      onBack={vi.fn()}
      onContinue={vi.fn()}
    />
  );
};

const column = (n: number) =>
  screen.getByRole('heading', { name: `Session ${n}` }).closest('div')!
    .parentElement!;

const pickFirstOpen = (n: number) => {
  const radio = within(column(n))
    .getAllByRole('radio')
    .find((el) => !(el as HTMLInputElement).disabled)!;
  fireEvent.click(radio);
};

const continueButton = () =>
  screen.getByRole('button', { name: 'Continue to Your Information' });

describe('PlanYourJourneyStep', () => {
  it('blocks Continue until at least one session is chosen', () => {
    render(<Harness />);
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('No sessions selected')).toBeInTheDocument();
  });

  // The ticket: any one of the three, in any combination, is enough to move on.
  it.each([[[1]], [[2]], [[3]], [[1, 2]], [[1, 3]], [[2, 3]], [[1, 2, 3]]])(
    'allows Continue with sessions %j',
    (sessions) => {
      render(<Harness />);
      sessions.forEach(pickFirstOpen);
      expect(continueButton()).toBeEnabled();
      expect(
        screen.getByText(`${sessions.length} of 3 sessions selected`),
      ).toBeInTheDocument();
    },
  );

  it('shows full times as unselectable', () => {
    render(<Harness />);
    const fullRadio = within(column(2)).getAllByRole('radio')[0];
    expect(fullRadio).toBeDisabled();
    expect(within(column(2)).getByText('Full')).toBeInTheDocument();
  });

  it('labels dates and times from the ET wall clock', () => {
    render(<Harness />);
    expect(
      within(column(1)).getByText('Sunday, October 4'),
    ).toBeInTheDocument();
    expect(within(column(1)).getByText('11:00 AM')).toBeInTheDocument();
  });

  // Campus is chosen once at the top; cards only show that campus's times and
  // offer no way to switch, so the user goes back to campus selection instead.
  it('shows only the selected campus with no per-session campus switch', () => {
    render(<Harness />);
    expect(screen.getByText('Selected campus:')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(column(3)).queryByText('Sunday, October 25')).toBeNull();
  });

  // Past dates stay listed so a group's sessions line up by month, but can't be booked.
  it('lists past dates as unselectable', () => {
    render(<Harness />);
    expect(
      within(column(1)).getByText('Sunday, September 27'),
    ).toBeInTheDocument();
    expect(within(column(1)).getByText('Passed')).toBeInTheDocument();
    expect(within(column(1)).getAllByRole('radio')[0]).toBeDisabled();
  });

  // Tells people a December class runs two sessions in one visit, without
  // flagging times from different groups that happen to share a date.
  it('badges sessions that share a day within the same group only', () => {
    render(<Harness />);
    const session2Dec = within(column(2))
      .getByText('9:45 AM')
      .closest('label')!;
    const session3Dec = within(column(3))
      .getByText('10:45 AM')
      .closest('label')!;
    const otherGroup = within(column(3)).getByText('6:00 PM').closest('label')!;

    expect(
      within(session2Dec).getByText('Same day as Session 3'),
    ).toBeInTheDocument();
    expect(
      within(session3Dec).getByText('Same day as Session 2'),
    ).toBeInTheDocument();
    expect(within(otherGroup).queryByText(/Same day/)).toBeNull();
  });

  it('can clear a selection back to not scheduled', () => {
    render(<Harness />);
    pickFirstOpen(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(continueButton()).toBeDisabled();
  });

  it('locks sessions already registered in this visit', () => {
    render(<Harness registered={{ 1: options[1] }} />);
    expect(within(column(1)).queryAllByRole('radio')).toHaveLength(0);
    expect(
      within(column(1)).getByText(/You.re registered for this session/),
    ).toBeInTheDocument();
  });
});

describe('JourneyConfirmation', () => {
  it('lists each registered session with its own date, time and campus', () => {
    render(
      <JourneyConfirmation
        campuses={campuses}
        registered={{
          1: options[2],
          3: opt(3, '2026-10-25T09:00', { campusId: 14 }),
        }}
        onScheduleAnother={vi.fn()}
        onRegisterSomeoneElse={vi.fn()}
      />,
    );

    expect(screen.getByText('Sunday, October 4')).toBeInTheDocument();
    expect(screen.getByText('11:00 AM ET')).toBeInTheDocument();
    expect(screen.getByText('Sunday, October 25')).toBeInTheDocument();
    expect(screen.getByText('Jupiter')).toBeInTheDocument();
    expect(
      screen.getByText(/You.ve scheduled 2 of 3 Journey sessions/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Get Directions/ }),
    ).toHaveLength(2);
  });

  it('hides "Schedule Another Session" once all three are booked', () => {
    render(
      <JourneyConfirmation
        campuses={campuses}
        registered={{ 1: options[1], 2: options[4], 3: options[5] }}
        onScheduleAnother={vi.fn()}
        onRegisterSomeoneElse={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Schedule Another Session' }),
    ).not.toBeInTheDocument();
  });
});

describe('YourInformationStep childcare', () => {
  const renderStep = (selection: JourneySessionSelection) => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <YourInformationStep
              campuses={campuses}
              selection={selection}
              registered={{}}
              isSpanish={false}
              onBack={vi.fn()}
              onSuccess={vi.fn()}
            />
          ),
        },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);
  };

  it('does not ask about childcare when no chosen session offers it', () => {
    renderStep({ 1: options[1] });
    expect(
      screen.queryByText('Will you need childcare?'),
    ).not.toBeInTheDocument();
  });

  // Rock reads childcare need from which counts arrive, so the counts only
  // exist in the form after the person says yes.
  it('asks about childcare and only shows the counts after "Yes"', () => {
    renderStep({ 2: opt(2, '2026-10-11T18:00', { offersChildcare: true }) });

    expect(screen.getByText('Will you need childcare?')).toBeInTheDocument();
    expect(screen.queryByLabelText('2 years')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Yes'));
    expect(screen.getByLabelText('2 years')).toHaveValue('0');

    fireEvent.click(screen.getByLabelText('No'));
    expect(screen.queryByLabelText('2 years')).not.toBeInTheDocument();
  });
});

describe('YourInformationStep going back to edit sessions', () => {
  const renderStep = (
    props: Partial<React.ComponentProps<typeof YourInformationStep>>,
  ) => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <YourInformationStep
              campuses={campuses}
              selection={{
                2: opt(2, '2026-10-11T18:00', { offersChildcare: true }),
              }}
              registered={{}}
              isSpanish={false}
              onBack={vi.fn()}
              onSuccess={vi.fn()}
              {...props}
            />
          ),
        },
      ],
      { initialEntries: ['/'] },
    );
    return render(<RouterProvider router={router} />);
  };

  // The step unmounts while the person edits sessions, so anything not handed
  // back to the parent is lost and they'd have to type it all again.
  it('restores everything entered after "Edit Sessions" and returning', () => {
    const onBack = vi.fn();
    const { unmount } = renderStep({ onBack });

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Ada' },
    });
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(screen.getByLabelText('Yes'));
    fireEvent.change(screen.getByLabelText('2 years'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Sessions' }));
    unmount();

    renderStep({ defaults: onBack.mock.calls[0][0] });

    expect(screen.getByLabelText('First Name')).toHaveValue('Ada');
    expect(screen.getByLabelText('Email Address')).toHaveValue(
      'ada@example.com',
    );
    expect(screen.getByLabelText('Yes')).toBeChecked();
    expect(screen.getByLabelText('2 years')).toHaveValue('2');
  });
});
