import { useMemo } from 'react';
import Icon from '~/primitives/icon';
import { Button } from '~/primitives/button/button.primitive';
import { cn } from '~/lib/utils';
import {
  formatSessionDateHeading,
  formatSessionShortDate,
  formatSessionTime,
  getSessionDateKey,
  isSameSessionOption,
  JOURNEY_SESSION_NUMBERS,
  type JourneyCampus,
  type JourneySessionNumber,
  type JourneySessionOption,
  type JourneySessionSelection,
} from '~/lib/journey-sessions';

export const SESSION_DESCRIPTIONS: Record<JourneySessionNumber, string> = {
  1: 'Discover the story behind Christ Fellowship and what it means to know God personally.',
  2: 'Find your place in the community and learn how faith grows through meaningful relationships.',
  3: 'Uncover your purpose and explore what it looks like to live on mission every day.',
};

interface PlanYourJourneyStepProps {
  campuses: JourneyCampus[];
  options: JourneySessionOption[];
  preferredCampusId: number;
  selection: JourneySessionSelection;
  /** Sessions already booked in this visit — shown locked. */
  registered: JourneySessionSelection;
  onChangePreferredCampus: () => void;
  onSelect: (
    sessionNumber: JourneySessionNumber,
    option: JourneySessionOption | undefined,
  ) => void;
  onSelectEarliest: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export const PlanYourJourneyStep = ({
  campuses,
  options,
  preferredCampusId,
  selection,
  registered,
  onChangePreferredCampus,
  onSelect,
  onSelectEarliest,
  onBack,
  onContinue,
}: PlanYourJourneyStepProps) => {
  const campusName = (id: number) =>
    campuses.find((campus) => campus.id === id)?.name ?? '';
  const selectedCount = JOURNEY_SESSION_NUMBERS.filter(
    (n) => selection[n],
  ).length;
  const registeredCount = JOURNEY_SESSION_NUMBERS.filter(
    (n) => registered[n],
  ).length;
  const openSessions = 3 - registeredCount;

  return (
    <div className='flex w-full flex-col gap-4'>
      <button
        type='button'
        onClick={onBack}
        className='flex w-fit items-center gap-1 text-sm font-semibold text-black'
      >
        <Icon name='chevronLeft' size={16} /> Back
      </button>
      <div className='flex flex-col gap-1'>
        <h3 className='text-xl font-bold text-black'>Plan Your Journey</h3>
        <p className='text-sm text-neutral-default'>
          Choose one, two, or all three sessions now. You can schedule the rest
          later.
        </p>
      </div>

      <div className='flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <p className='flex items-center gap-1 text-sm text-neutral-default'>
          <Icon name='map' size={14} className='text-ocean' />
          Selected campus:
          <span className='font-semibold text-black'>
            {campusName(preferredCampusId)}
          </span>
          <button
            type='button'
            onClick={onChangePreferredCampus}
            className='ml-1 font-semibold text-ocean'
          >
            Change
          </button>
        </p>
        {openSessions > 0 && (
          <button
            type='button'
            onClick={onSelectEarliest}
            className='flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-black hover:border-ocean'
          >
            <Icon name='calendarPlus' size={14} className='text-ocean' />
            {openSessions === 3
              ? 'Select Earliest Available for All Three'
              : 'Select Earliest Available'}
          </button>
        )}
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {JOURNEY_SESSION_NUMBERS.map((sessionNumber) => (
          <SessionColumn
            key={sessionNumber}
            sessionNumber={sessionNumber}
            campusId={preferredCampusId}
            options={options}
            selected={selection[sessionNumber]}
            registered={registered[sessionNumber]}
            onSelect={(option) => onSelect(sessionNumber, option)}
          />
        ))}
      </div>

      <div className='flex flex-col gap-3 border-t border-neutral-lightest pt-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-sm font-semibold text-black'>
            {selectedCount === 0
              ? 'No sessions selected'
              : `${selectedCount + registeredCount} of 3 sessions selected`}
          </p>
          <p className='text-xs text-neutral-default'>
            {selectedCount === 0
              ? 'Select at least one session to continue.'
              : 'You can schedule the remaining sessions later.'}
          </p>
        </div>
        <Button
          size='md'
          className='h-12 rounded-lg disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[230px]'
          disabled={selectedCount === 0}
          onClick={onContinue}
        >
          Continue to Your Information
        </Button>
      </div>
    </div>
  );
};

interface SessionColumnProps {
  sessionNumber: JourneySessionNumber;
  campusId: number;
  options: JourneySessionOption[];
  selected?: JourneySessionOption;
  registered?: JourneySessionOption;
  onSelect: (option: JourneySessionOption | undefined) => void;
}

const SessionColumn = ({
  sessionNumber,
  campusId,
  options,
  selected,
  registered,
  onSelect,
}: SessionColumnProps) => {
  const optionsByDate = useMemo(() => {
    const groups = new Map<string, JourneySessionOption[]>();
    options
      .filter(
        (option) =>
          option.sessionNumber === sessionNumber &&
          option.campusId === campusId,
      )
      .forEach((option) => {
        const key = getSessionDateKey(option.startsAt);
        groups.set(key, [...(groups.get(key) ?? []), option]);
      });
    return [...groups.entries()];
  }, [options, sessionNumber, campusId]);

  const summary = registered ?? selected;

  return (
    <div className='flex flex-col rounded-lg border border-gray-200 bg-white'>
      <div className='flex flex-col gap-2 border-b border-neutral-lightest p-4'>
        <h4 className='flex items-center gap-1 font-bold text-black'>
          Session {sessionNumber}
          {summary && (
            <Icon name='checkCircle' size={16} className='text-ocean' />
          )}
        </h4>
        <p className='text-xs text-neutral-default'>
          {SESSION_DESCRIPTIONS[sessionNumber]}
        </p>
        <p
          className={cn(
            'rounded-md px-2 py-1.5 text-xs',
            summary
              ? 'bg-ocean-subdued font-semibold text-ocean'
              : 'bg-neutral-lightest text-neutral-default',
          )}
        >
          {summary
            ? `${registered ? 'Registered · ' : ''}${formatSessionShortDate(summary.startsAt)} · ${formatSessionTime(summary.startsAt)}`
            : 'Not scheduled'}
        </p>
      </div>

      {registered ? (
        <p className='p-4 text-sm text-neutral-default'>
          You&apos;re registered for this session.
        </p>
      ) : (
        <div className='flex flex-col gap-4 p-4'>
          {optionsByDate.length === 0 && (
            <p className='text-sm text-neutral-default'>
              No upcoming times at this campus. Try another campus.
            </p>
          )}
          {optionsByDate.map(([dateKey, dateOptions]) => (
            <fieldset key={dateKey} className='flex flex-col gap-1'>
              <legend
                className={cn(
                  'mb-1 text-sm font-semibold',
                  dateOptions.every((option) => option.isPast)
                    ? 'text-neutral-light'
                    : 'text-black',
                )}
              >
                {formatSessionDateHeading(dateOptions[0].startsAt)}
              </legend>
              {dateOptions.map((option) => {
                const isSelected = isSameSessionOption(option, selected);
                const isUnavailable = option.isFull || option.isPast;
                return (
                  <label
                    key={`${option.groupGuid}-${option.startsAt}`}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2 text-sm',
                      isSelected && 'bg-ocean-subdued',
                      isUnavailable
                        ? 'cursor-not-allowed text-neutral-light'
                        : 'cursor-pointer text-black',
                    )}
                  >
                    <input
                      type='radio'
                      name={`session-${sessionNumber}`}
                      checked={isSelected}
                      disabled={isUnavailable}
                      onChange={() => onSelect(option)}
                      className='accent-ocean'
                    />
                    <span
                      className={cn(
                        option.isFull && !option.isPast && 'line-through',
                      )}
                    >
                      {formatSessionTime(option.startsAt)}
                    </span>
                    {option.isPast ? (
                      <span className='rounded border border-neutral-light px-1 text-[10px] text-neutral-light'>
                        Passed
                      </span>
                    ) : (
                      option.isFull && (
                        <span className='rounded border border-alert px-1 text-[10px] text-alert'>
                          Full
                        </span>
                      )
                    )}
                  </label>
                );
              })}
            </fieldset>
          ))}
          {selected && (
            <button
              type='button'
              onClick={() => onSelect(undefined)}
              className='w-fit text-xs text-neutral-default underline'
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
};
