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
    title: `Journey Session ${option.sessionNumber}`,
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
  const findCampus = (id: number) =>
    campuses.find((campus) => campus.id === id);

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
        {sessions.map((option) => {
          const campus = findCampus(option.campusId);
          const event = buildCalendarEvent(option, campus);
          const address = campusAddress(campus);
          return (
            <div
              key={option.sessionNumber}
              className='flex flex-col gap-1 rounded-lg border border-neutral-lighter p-3'
            >
              <p className='flex items-center gap-1 font-bold text-black'>
                <Icon name='checkCircle' size={16} className='text-success' />
                Session {option.sessionNumber}
              </p>
              <p className='flex items-center gap-2 text-sm text-neutral-default'>
                <Icon name='calendarAlt' size={14} className='text-ocean' />
                {formatSessionDateHeading(option.startsAt)}
              </p>
              <p className='flex items-center gap-2 text-sm text-neutral-default'>
                <Icon name='timeFive' size={14} className='text-ocean' />
                {formatSessionTime(option.startsAt)} ET
              </p>
              <p className='flex items-center gap-2 text-sm text-neutral-default'>
                <Icon name='map' size={14} className='text-ocean' />
                {campus?.name}
              </p>
              <div className='mt-2 flex flex-wrap gap-2'>
                <AddToCalendar
                  googleHref={`${googleCalendarLink(event)}&ctz=America/New_York`}
                  getIcsUrl={() => icsLink(event)}
                  eventDate={parseISO(option.startsAt)}
                  buttonSize='sm'
                  buttonClassName='rounded-md'
                />
                {address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-2 rounded-md border border-neutral-lighter px-3 py-2 text-sm font-semibold text-black hover:border-ocean'
                  >
                    <Icon name='locationArrow' size={14} />
                    Get Directions
                  </a>
                )}
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
