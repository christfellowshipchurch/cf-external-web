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
import { getJourneyCopy, type JourneyCopy } from './journey-copy';

interface PlanYourJourneyStepProps {
  campuses: JourneyCampus[];
  options: JourneySessionOption[];
  preferredCampusId: number;
  selection: JourneySessionSelection;
  /** Sessions already booked in this visit — shown locked. */
  registered: JourneySessionSelection;
  isSpanish: boolean;
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
  isSpanish,
  onChangePreferredCampus,
  onSelect,
  onSelectEarliest,
  onBack,
  onContinue,
}: PlanYourJourneyStepProps) => {
  const copy = getJourneyCopy(isSpanish);
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
        <Icon name='chevronLeft' size={16} /> {copy.back}
      </button>
      <div className='flex flex-col gap-1'>
        <h3 className='text-xl font-bold text-black'>{copy.planHeading}</h3>
        <p className='text-sm text-neutral-default'>{copy.planIntro}</p>
      </div>

      <div className='flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <p className='flex items-center gap-1 text-sm text-neutral-default'>
          <Icon name='map' size={14} className='text-ocean' />
          {copy.selectedCampus}
          <span className='font-semibold text-black'>
            {campusName(preferredCampusId)}
          </span>
          <button
            type='button'
            onClick={onChangePreferredCampus}
            className='ml-1 font-semibold text-ocean'
          >
            {copy.change}
          </button>
        </p>
        {openSessions > 0 && (
          <button
            type='button'
            onClick={onSelectEarliest}
            className='flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-black hover:border-ocean'
          >
            <Icon name='calendarPlus' size={14} className='text-ocean' />
            {copy.selectEarliest}
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
            isSpanish={isSpanish}
            copy={copy}
          />
        ))}
      </div>

      <div className='flex flex-col gap-3 border-t border-neutral-lightest pt-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-sm font-semibold text-black'>
            {selectedCount === 0
              ? copy.noSessionsSelected
              : copy.sessionsSelected(selectedCount + registeredCount)}
          </p>
          <p className='text-xs text-neutral-default'>
            {selectedCount === 0
              ? copy.selectAtLeastOne
              : copy.scheduleRemainingLater}
          </p>
        </div>
        <Button
          size='md'
          className='h-12 rounded-lg disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[230px]'
          disabled={selectedCount === 0}
          onClick={onContinue}
        >
          {copy.continueToInformation}
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
  isSpanish: boolean;
  copy: JourneyCopy;
}

const SessionColumn = ({
  sessionNumber,
  campusId,
  options,
  selected,
  registered,
  onSelect,
  isSpanish,
  copy,
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

  // Some groups hold two sessions back to back on one day; only compare within
  // a group, since mixing groups can land on the same day by coincidence.
  const sameDaySessions = (option: JourneySessionOption) =>
    options
      .filter(
        (other) =>
          other.groupGuid === option.groupGuid &&
          other.sessionNumber !== option.sessionNumber &&
          getSessionDateKey(other.startsAt) ===
            getSessionDateKey(option.startsAt),
      )
      .map((other) => other.sessionNumber);

  // All three sessions on one day get a single "Same Day" badge instead of one per session.
  const sameDayBadges = (option: JourneySessionOption) => {
    const sessions = sameDaySessions(option);
    return sessions.length === JOURNEY_SESSION_NUMBERS.length - 1
      ? [copy.sameDay]
      : sessions.map((n) => copy.sameDayAs(n));
  };

  return (
    // On desktop each card spans the parent's two rows as a subgrid, so every
    // card's header is as tall as the tallest description and the pills and
    // times line up across the three cards.
    <div className='flex flex-col rounded-lg border border-gray-200 bg-white md:row-span-2 md:grid md:grid-rows-subgrid md:gap-0'>
      <div className='flex flex-col gap-2 border-b border-neutral-lightest p-4'>
        <h4 className='flex items-center gap-1 font-bold text-black'>
          {copy.session(sessionNumber)}
          {summary && (
            <Icon name='checkCircle' size={16} className='text-ocean' />
          )}
        </h4>
        <p className='flex-1 text-xs text-neutral-default'>
          {copy.sessionDescriptions[sessionNumber]}
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
            ? `${registered ? `${copy.registered} · ` : ''}${formatSessionShortDate(summary.startsAt, isSpanish)} · ${formatSessionTime(summary.startsAt)}`
            : copy.notScheduled}
        </p>
      </div>

      {registered ? (
        <p className='p-4 text-sm text-neutral-default'>
          {copy.registeredForSession}
        </p>
      ) : (
        <div className='flex flex-col gap-4 p-4'>
          {optionsByDate.length === 0 && (
            <p className='text-sm text-neutral-default'>
              {copy.noUpcomingTimes}
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
                {formatSessionDateHeading(dateOptions[0].startsAt, isSpanish)}
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
                        {copy.passed}
                      </span>
                    ) : (
                      <>
                        {option.isFull && (
                          <span className='rounded border border-alert px-1 text-[10px] text-alert'>
                            {copy.full}
                          </span>
                        )}
                        {sameDayBadges(option).map((badge) => (
                          <span
                            key={badge}
                            className='rounded border border-ocean px-1 text-[10px] text-ocean'
                          >
                            {badge}
                          </span>
                        ))}
                      </>
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
              {copy.clearSelection}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
