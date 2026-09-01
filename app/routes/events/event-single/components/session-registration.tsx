import { useLoaderData } from 'react-router-dom';
import { EventSinglePageType, SessionRegistrationCardType } from '../types';
import Icon from '~/primitives/icon';
import { Button } from '~/primitives/button/button.primitive';
import HtmlRenderer from '~/primitives/html-renderer';
import { AddToCalendar } from '~/components/add-to-calendar/add-to-calendar.component';
import { googleCalendarLink, icsLink } from '~/lib/utils';
import { htmlToPlainText } from '~/lib/text-content';

/** Used when Rock's per-session "Call to Action" is blank. */
const DEFAULT_CTA_TITLE = 'Get Tickets';

/** Sessions have a start but no end in Rock, so block out two hours. */
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export function SessionRegistration() {
  const { title, sessionScheduleCards } = useLoaderData<EventSinglePageType>();
  return (
    <section className='w-full py-8 md:py-16 content-padding bg-gray'>
      <div className='w-full flex flex-col gap-4 mx-auto text-center max-w-xl'>
        <h2 className='heading-h3 text-center'>Get Tickets for {title}</h2>
        <p className='text-gray-500'>
          Choose your location and get your tickets for this {title} event
          {sessionScheduleCards &&
            sessionScheduleCards.length > 0 &&
            ` on ${sessionScheduleCards[0].date}`}
          .
        </p>
        <h3 className='font-bold text-black text-lg mt-10'>
          Choose your experience
        </h3>
        <p className='text-gray-500'>
          Select your location for {title}. Each location offers the same great
          experience with Earl McLean and Pastor Todd Mullins.
        </p>
      </div>
      <div className='w-full max-w-screen-content gap-4 mx-auto text-center mt-8 flex justify-center flex-wrap'>
        {sessionScheduleCards &&
          sessionScheduleCards.length > 0 &&
          sessionScheduleCards.map((card) => (
            <SessionRegistrationCard
              key={card.title}
              card={card}
              eventTitle={title}
            />
          ))}
      </div>
      <p className='text-gray-500 text-xs text-center mt-8'>
        By clicking “Get Tickets,” you will be redirected to our secure
        ticketing partner to complete your registration.{' '}
      </p>
    </section>
  );
}

const SessionRegistrationCard = ({
  card,
  eventTitle,
}: {
  card: SessionRegistrationCardType;
  eventTitle: string;
}) => {
  const startTime = card.startDateTime ? new Date(card.startDateTime) : null;
  const hasCalendarDate = Boolean(startTime && !isNaN(startTime.getTime()));

  const calendarEvent = hasCalendarDate
    ? {
        title: `${eventTitle} - ${card.title}`,
        description: htmlToPlainText(card.additionalInfo || ''),
        address: card.description,
        startTime: startTime as Date,
        endTime: new Date((startTime as Date).getTime() + SESSION_DURATION_MS),
      }
    : null;

  const showCta = Boolean(card.ctaUrl);
  const showAddToCalendar = Boolean(card.showAddToCalendar && calendarEvent);

  return (
    <div className='bg-white rounded-lg shadow-sm p-5 flex flex-col text-left w-[248px] min-h-[374px]'>
      {/* Location Section */}
      <div className='flex flex-2 gap-4 items-start'>
        <div className='bg-navy-subdued rounded-lg p-3 shrink-0'>
          <Icon name={card.icon} color='currentColor' />
        </div>
        <div className='flex flex-col'>
          <h4 className='font-semibold'>{card.title}</h4>
          <p className='text-gray-500 text-sm leading-tight mt-1'>
            {card.description}
          </p>
        </div>
      </div>

      {/* Event Details Section */}
      <div className='flex flex-col flex-3 gap-3'>
        {/* Date */}
        <div className='flex items-center gap-3'>
          <Icon name='calendarAlt' size={20} className='shrink-0 text-ocean' />
          <p className='text-sm text-gray-500'>{card.date}</p>
        </div>

        {/* Party Time */}
        {card.partyTime && (
          <div className='flex items-center gap-3'>
            <Icon name='timeFive' size={20} className='shrink-0 text-ocean' />
            <p className='text-sm text-gray-500'>Party at {card.partyTime}.</p>
          </div>
        )}

        {/* Program Time */}
        {card.programTime && (
          <div className='flex items-center gap-3'>
            <Icon name='timeFive' size={20} className='shrink-0 text-ocean' />
            <p className='text-sm text-gray-500'>
              Program starts at {card.programTime}
            </p>
          </div>
        )}

        {/* Additional Info */}
        {card.additionalInfo && (
          <div className='flex items-center gap-3'>
            <Icon name='foodMenu' size={20} className='shrink-0 text-ocean' />
            <HtmlRenderer
              html={card.additionalInfo}
              className='text-sm text-gray-500'
            />
          </div>
        )}
      </div>

      {/* CTA + Add to Calendar — the wrapper carries its own gap and top
          padding, so it must not render when neither button does or it leaves
          dead space at the bottom of the card. */}
      {(showCta || showAddToCalendar) && (
        <div className='mt-auto flex flex-col gap-2 pt-4'>
          {showCta && (
            <Button
              intent='primary'
              href={card.ctaUrl}
              size='md'
              className='w-full'
            >
              {card.ctaTitle || DEFAULT_CTA_TITLE}
            </Button>
          )}

          {showAddToCalendar && calendarEvent && (
            <AddToCalendar
              googleHref={googleCalendarLink(calendarEvent)}
              getIcsUrl={() => icsLink(calendarEvent)}
              eventDate={calendarEvent.startTime}
              // Match the CTA above it: same size and radius, so the two read
              // as a pair rather than the calendar button looming over it.
              buttonSize='md'
              buttonClassName='rounded-md'
            />
          )}
        </div>
      )}
    </div>
  );
};
