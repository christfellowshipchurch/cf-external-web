import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { googleCalendarLink, icsLinkEvents } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { AddToCalendar } from '~/components/add-to-calendar/add-to-calendar.component';
import { LoaderReturnType } from '~/routes/set-a-reminder/loader';

const ReminderConfirmation = ({
  serviceTime,
  onSuccess,
  campusUrl,
  location,
}: {
  serviceTime: string;
  onSuccess: () => void;
  campusUrl: string;
  location: string;
}) => {
  const [formData, setFormData] = useState<LoaderReturnType | null>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load(`/set-a-reminder?location=${campusUrl}`);
  }, [campusUrl]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setFormData(fetcher.data as LoaderReturnType);
    }
  }, [fetcher.state, fetcher.data]);

  if (!formData) {
    return <div>Loading...</div>;
  }

  const { address, url } = formData;
  const events = icsLinkEvents({
    serviceTimes: [{ day: 'Sunday', time: serviceTime }],
    address,
    campusName: location,
    url: `https://christfellowship.church/locations/${url}`,
  });

  // Server endpoint returns text/calendar with Content-Disposition: inline —
  // iOS Safari shows the native "Add to Calendar" sheet, Android opens it
  // with the user's default calendar app (no manual download step needed).
  const icsServerUrl = `/calendar-ics?campus=${encodeURIComponent(campusUrl)}&time=${encodeURIComponent(serviceTime)}`;
  const googleHref = googleCalendarLink(events[0].event);
  const isEspanol = location?.includes('Español');

  return (
    <div className='flex flex-col items-center gap-4 p-8'>
      <Icon name='check' size={96} color='#1ec27f' />
      <h2 className='font-bold text-2xl text-navy text-center'>
        {isEspanol
          ? 'Asegúrese de revisar su correo electrónico para obtener más detalles y nos vemos este domingo.'
          : "Be sure to check out your email for more details and we'll see you this Sunday!"}
      </h2>
      <div className='flex flex-col sm:flex-row gap-2 mt-4 w-full justify-center'>
        <AddToCalendar
          googleHref={googleHref}
          getIcsUrl={() => icsServerUrl}
          eventDate={events[0].event.startTime as Date}
          label={isEspanol ? 'Añadir al Calendario' : 'Add to Calendar'}
          className='flex-1 md:flex-none'
        />

        <Button
          intent='primary'
          className='rounded-xl w-full sm:w-52'
          onClick={() => onSuccess()}
        >
          {isEspanol ? 'Continuar' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default ReminderConfirmation;
