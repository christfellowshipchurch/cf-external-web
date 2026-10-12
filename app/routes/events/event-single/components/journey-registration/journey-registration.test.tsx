import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type {
  JourneySessionNumber,
  JourneySessionOption,
  JourneySessionSelection,
} from '~/lib/journey-sessions';
import { PlanYourJourneyStep } from './plan-your-journey-step.component';
import { JourneyConfirmation } from './journey-confirmation.component';

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
  ...extra,
});

const options = [
  opt(1, '2026-10-04T09:00'),
  opt(1, '2026-10-04T11:00'),
  opt(2, '2026-10-11T09:00', { isFull: true }),
  opt(2, '2026-10-11T11:00'),
  opt(3, '2026-10-18T09:00'),
  opt(3, '2026-10-25T09:00', { campusId: 14 }),
];

const Harness = ({
  registered = {},
}: {
  registered?: JourneySessionSelection;
}) => {
  const [selection, setSelection] = useState<JourneySessionSelection>({});
  const [campusIds, setCampusIds] = useState({ 1: 2, 2: 2, 3: 2 });
  return (
    <PlanYourJourneyStep
      campuses={campuses}
      options={options}
      preferredCampusId={2}
      sessionCampusIds={campusIds}
      selection={selection}
      registered={registered}
      onChangePreferredCampus={vi.fn()}
      onChangeSessionCampus={(n, id) =>
        setCampusIds((prev) => ({ ...prev, [n]: id }))
      }
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

  it('changing one session’s campus only changes that session’s times', () => {
    render(<Harness />);
    fireEvent.change(within(column(3)).getByRole('combobox'), {
      target: { value: '14' },
    });

    expect(
      within(column(3)).getByText('Sunday, October 25'),
    ).toBeInTheDocument();
    expect(
      within(column(1)).getByText('Sunday, October 4'),
    ).toBeInTheDocument();
  });

  it('can clear a selection back to not scheduled', () => {
    render(<Harness />);
    pickFirstOpen(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(continueButton()).toBeDisabled();
  });

  it('locks sessions already registered in this visit', () => {
    render(<Harness registered={{ 1: options[0] }} />);
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
          1: options[1],
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
        registered={{ 1: options[0], 2: options[3], 3: options[4] }}
        onScheduleAnother={vi.fn()}
        onRegisterSomeoneElse={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Schedule Another Session' }),
    ).not.toBeInTheDocument();
  });
});
