import { addMinutes, format, parseISO } from 'date-fns';
import Icon from '~/primitives/icon';
import { Button } from '~/primitives/button/button.primitive';
import { AddToCalendar } from '~/components/add-to-calendar/add-to-calendar.component';
import { googleCalendarLink, icsLink } from '~/lib/utils';
import {
  formatSessionDateHeading,
  formatSessionTime,
  JOURNEY_SESSION_NUMBERS,
  type JourneyCampus,
  type JourneySessionOption,
  type JourneySessionSelection,
} from '~/lib/journey-sessions';
import { SESSION_DESCRIPTIONS } from './plan-your-journey-step.component';

/** Rock doesn't store an end time for Journey sessions; calendar entries assume 90 minutes. */
const SESSION_LENGTH_MINUTES = 90;

/** Compact neutral outline shared by Add to Calendar and Get Directions, per the Figma session card. */
const SESSION_ACTION_CLASSES =
  'inline-flex h-auto min-h-0 min-w-0 items-center rounded-md border border-neutral-lighter bg-white px-3 py-1.5 text-sm font-medium text-black hover:border-ocean';

interface JourneyConfirmationProps {
  campuses: JourneyCampus[];
  registered: JourneySessionSelection;
  onScheduleAnother: () => void;
  onRegisterSomeoneElse: () => void;
}

const campusAddress = (campus?: JourneyCampus) =>
  campus?.street1 ? `${campus.street1}, ${campus.city}, FL` : '';

/**
 * `startsAt` is Eastern wall-clock. parseISO + format round-trips those digits
 * unchanged in any zone, and the ICS/Google links pin them to America/New_York.
 */
const buildCalendarEvent = (
  option: JourneySessionOption,
  campus?: JourneyCampus,
) => {
  const start = parseISO(option.startsAt);
  return {
    title: `CF Journey Session ${option.sessionNumber}${campus?.name ? ` · ${campus.name}` : ''}`,
    description: SESSION_DESCRIPTIONS[option.sessionNumber],
    address: campusAddress(campus) || campus?.name || '',
    startTime: option.startsAt,
    endTime: format(
      addMinutes(start, SESSION_LENGTH_MINUTES),
      "yyyy-MM-dd'T'HH:mm",
    ),
  };
};

export const JourneyConfirmation = ({
  campuses,
  registered,
  onScheduleAnother,
  onRegisterSomeoneElse,
}: JourneyConfirmationProps) => {
  const sessions = JOURNEY_SESSION_NUMBERS.flatMap((n) =>
    registered[n] ? [registered[n]] : [],
  );
  // A person registers at one campus, so every session shares the first one's campus.
  const campus = campuses.find((c) => c.id === sessions[0]?.campusId);

  return (
    <div className='mx-auto flex w-full max-w-[560px] flex-col items-center gap-4'>
      <Icon name='checkCircle' size={56} className='text-success' />
      <div className='text-center'>
        <h3 className='text-xl font-bold text-black'>You&apos;re Registered</h3>
        <p className='text-sm text-neutral-default'>
          We&apos;ll email your confirmation and send reminders before each
          scheduled session.
        </p>
      </div>

      <div className='flex w-full flex-col gap-3 rounded-xl border border-neutral-lighter bg-white p-4'>
        <h4 className='font-bold text-black'>Registered Sessions</h4>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='flex items-center gap-2 text-sm text-neutral-default'>
            <Icon name='map' size={14} className='text-ocean' />
            {campus?.name}
          </p>
          {campus?.mapLink && (
            <a
              href={campus.mapLink}
              target='_blank'
              rel='noopener noreferrer'
              className={SESSION_ACTION_CLASSES}
            >
              <Icon name='locationArrow' size={16} className='mr-2' />
              Get Directions
            </a>
          )}
        </div>
        {sessions.map((option) => {
          const event = buildCalendarEvent(option, campus);
          return (
            <div
              key={option.sessionNumber}
              className='flex flex-col gap-2 rounded-lg border border-neutral-lighter p-4'
            >
              <p className='flex items-center gap-2 font-semibold text-black'>
                <Icon name='checkCircle' size={16} className='text-success' />
                Session {option.sessionNumber}
              </p>
              {/* Details sit under the title text, not the check icon (16px icon + 8px gap). */}
              <div className='flex flex-col gap-1.5 pl-6 text-sm text-neutral-default'>
                <p className='flex items-center gap-2'>
                  <Icon name='calendarAlt' size={14} className='text-ocean' />
                  {formatSessionDateHeading(option.startsAt)}
                </p>
                <p className='flex items-center gap-2'>
                  <Icon name='timeFive' size={14} className='text-ocean' />
                  {formatSessionTime(option.startsAt)} ET
                </p>
                <div className='mt-1 flex flex-wrap gap-2'>
                  <AddToCalendar
                    googleHref={`${googleCalendarLink(event)}&ctz=America/New_York`}
                    getIcsUrl={() => icsLink(event)}
                    eventDate={parseISO(option.startsAt)}
                    buttonSize='sm'
                    buttonClassName={SESSION_ACTION_CLASSES}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length < 3 && (
        <div className='flex w-full flex-col items-center gap-3 rounded-xl border border-neutral-lighter bg-white p-4 text-center'>
          <p className='text-sm text-black'>
            You&apos;ve scheduled {sessions.length} of 3 Journey sessions. You
            can schedule the remaining sessions now or return later.
          </p>
          <Button
            intent='secondary'
            size='sm'
            className='rounded-md'
            onClick={onScheduleAnother}
          >
            Schedule Another Session
          </Button>
        </div>
      )}

      <Button
        intent='secondary'
        size='md'
        className='w-full rounded-xl'
        onClick={onRegisterSomeoneElse}
      >
        Register Someone Else
      </Button>
    </div>
  );
};
