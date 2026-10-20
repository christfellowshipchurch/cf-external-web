import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  FormStep,
  getRegistrationSearchOutcome,
} from './clickthrough-registration.component';

vi.mock(
  '~/components/modals/baptism-sign-up/baptism-sign-up-form.component',
  () => ({
    default: ({ onSuccess }: { onSuccess: (details: object) => void }) => (
      <button
        type='button'
        onClick={() => onSuccess({ firstName: 'Ada', lastName: 'Lovelace' })}
      >
        Submit Baptism form
      </button>
    ),
  }),
);

vi.mock('~/components/modals/baptism-sign-up/confirmation.component', () => ({
  default: ({
    details,
    buttonText,
    onContinue,
  }: {
    details: { title: string; campus: string; name: string };
    buttonText: string;
    onContinue: () => void;
  }) => (
    <div>
      <p>{details.title}</p>
      <p>{details.campus}</p>
      <p>{details.name}</p>
      <button type='button' onClick={onContinue}>
        {buttonText}
      </button>
    </div>
  ),
}));

describe('getRegistrationSearchOutcome', () => {
  // Placeholder results already report zero hits. Treating that as "no
  // sessions" would flash the check-back message before Algolia answers.
  it('stays loading for placeholder results even when there are no hits', () => {
    expect(
      getRegistrationSearchOutcome({
        isArtificial: true,
        status: 'idle',
        nbHits: 0,
      }),
    ).toBe('loading');
  });

  it('stays loading while the search is in flight', () => {
    expect(
      getRegistrationSearchOutcome({
        isArtificial: false,
        status: 'loading',
        nbHits: 0,
      }),
    ).toBe('loading');
    expect(
      getRegistrationSearchOutcome({
        isArtificial: false,
        status: 'stalled',
        nbHits: 0,
      }),
    ).toBe('loading');
  });

  it('opens registration once a real response has sessions', () => {
    expect(
      getRegistrationSearchOutcome({
        isArtificial: false,
        status: 'idle',
        nbHits: 3,
      }),
    ).toBe('ready');
  });

  it('shows the empty message when a real response has no sessions', () => {
    expect(
      getRegistrationSearchOutcome({
        isArtificial: false,
        status: 'idle',
        nbHits: 0,
      }),
    ).toBe('empty');
  });

  // A failed first request leaves the placeholder results in place. That has
  // to count as an error, or the skeleton never clears and an outage looks
  // like there is nothing to register for.
  it('reports an error when the search fails, even if results are still a placeholder', () => {
    expect(
      getRegistrationSearchOutcome({
        isArtificial: true,
        status: 'error',
        nbHits: 0,
      }),
    ).toBe('error');
  });
});

describe('FormStep', () => {
  it('uses the native Baptism form, shows event details on success, and resets for another registration', () => {
    const onResetRegistration = vi.fn();

    render(
      <FormStep
        groupGuid='baptism-group'
        groupType='Baptism'
        selectedCampus='Palm Beach Gardens'
        selectedDate='2026-08-02'
        selectedDay='Sunday'
        selectedTime='10:00 AM'
        onResetRegistration={onResetRegistration}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Submit Baptism form' }),
    );

    expect(screen.getByText('Baptism Details')).toBeInTheDocument();
    expect(screen.getByText('Palm Beach Gardens')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Register someone else' }),
    );

    expect(onResetRegistration).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Submit Baptism form' }),
    ).toBeInTheDocument();
  });
});
