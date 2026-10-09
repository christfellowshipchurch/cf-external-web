import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { useNavigate } from 'react-router';
import { googleCalendarLink, icsLink, icsLinkEvents } from '~/lib/utils';
import { AddToCalendar } from '~/components/add-to-calendar/add-to-calendar.component';

interface JourneyFinderSignUpConfirmationProps {
  onSuccess?: () => void;
  onContinue?: () => void;
  buttonText?: string;
  calendarTitle?: string;
  calendarDescription?: string;
  details?: {
    title: string;
    campus: string;
    date: string;
    time: string;
    name: string;
  };
}

const JourneyFinderSignUpConfirmation: React.FC<
  JourneyFinderSignUpConfirmationProps
> = ({
  onSuccess,
  onContinue,
  buttonText = 'Continue',
  calendarTitle = 'The Journey at Christ Fellowship Church',
  calendarDescription,
  details,
}) => {
  const navigate = useNavigate();

  const handleClose = () => {
    if (onContinue) {
      onContinue();
      return;
    }
    if (onSuccess) {
      onSuccess();
    } else {
      navigate('/');
    }
  };

  const events = details
    ? icsLinkEvents({
        title: calendarTitle,
        description: calendarDescription,
        serviceTimes: [{ day: 'Sunday', time: details.time }],
        address: details.campus,
        campusName: details.title,
        url: `https://christfellowship.church`,
      })
    : [];

  return (
    <div className='flex w-full flex-col items-center gap-6 p-4 text-center md:p-8'>
      <div className='flex size-16 items-center justify-center rounded-full border-4 border-[#2cc463]'>
        <Icon name='check' size={42} color='#2cc463' />
      </div>
      <div className='flex flex-col gap-2'>
        <h1 className='font-bold text-2xl text-black'>You're all set!</h1>
        <p className='max-w-sm text-lg font-medium text-[#717182]'>
          We're so excited to see what God has in store for you!
        </p>
      </div>

      {details && (
        <div className='w-full rounded-xl border border-neutral-lighter bg-white p-6 text-left shadow-sm md:p-8'>
          <h2 className='mb-8 text-center text-xl font-semibold text-black'>
            {details.title}
          </h2>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <DetailItem icon='map' label='Campus' value={details.campus} />
            <DetailItem icon='calendarAlt' label='Date' value={details.date} />
            <DetailItem icon='timeFive' label='Time' value={details.time} />
            <DetailItem icon='user' label='Name' value={details.name} />
          </div>
        </div>
      )}

      {details && events[0] && (
        <AddToCalendar
          googleHref={googleCalendarLink(events[0].event)}
          getIcsUrl={() => icsLink(events[0].event)}
          eventDate={events[0].event.startTime as Date}
          className='w-full'
        />
      )}

      <Button
        intent='primary'
        className='h-14 w-full rounded-xl text-lg font-bold'
        onClick={handleClose}
      >
        {buttonText}
      </Button>
    </div>
  );
};

const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: 'map' | 'calendarAlt' | 'timeFive' | 'user';
  label: string;
  value: string;
}) => (
  <div className='flex items-start gap-3'>
    <Icon name={icon} size={24} className='mt-1 text-ocean' />
    <div>
      <p className='text-sm font-medium text-[#717182]'>{label}</p>
      <p className='text-lg font-medium text-black'>{value}</p>
    </div>
  </div>
);

export default JourneyFinderSignUpConfirmation;
