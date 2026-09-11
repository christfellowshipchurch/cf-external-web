import Icon from '~/primitives/icon';
import { VirtualTourTabs } from '../components/virtual-tour.component';
import {
  DuringTheWeek,
  type WeeklyMinistryService,
} from '../components/during-the-week.component';
import { CTAs } from '../components/ctas.component';
import { icons } from '~/lib/icons';
import { dayTimes, formattedServiceTimes } from '~/lib/utils';

interface CampusInfoProps {
  isOnline?: boolean;
  campusName: string;
  digitalTourVideo: string;
  campusLocation?: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    postalCode: string;
  };
  serviceTimes: string;
  weeklyMinistryServices?: WeeklyMinistryService[];
  phoneNumber: string;
  additionalInfo: string[];
}

const IconText = ({
  icon,
  text,
  serviceTimes,
}: {
  icon: keyof typeof icons;
  text?: string;
  serviceTimes?: dayTimes[];
}) => {
  const formattedTimes = serviceTimes?.map((time) => {
    return {
      day: time.day,
      hour:
        time.day?.toLowerCase() === 'ondemand'
          ? undefined
          : time.hour
            ? time.hour.join(', ')
            : time.hour || '',
    };
  });

  return (
    <div className='flex items-start gap-2'>
      <Icon name={icon} className='text-ocean mb-auto mt-[3px] md:m-0' />
      {text ? (
        <p className='text-lg font-semibold'>{text}</p>
      ) : (
        <div className='flex flex-col md:flex-row md:gap-2'>
          {formattedTimes?.map((time, index) => (
            <p key={index} className='text-lg font-semibold'>
              {index > 0 && '| '} {time.day} {time.hour ? `| ${time.hour}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export const CampusInfo = ({
  isOnline,
  campusName,
  digitalTourVideo,
  campusLocation,
  weeklyMinistryServices,
  phoneNumber,
  additionalInfo,
  serviceTimes,
}: CampusInfoProps) => {
  const isSpanish = campusName?.includes('Español');

  const address = `${campusLocation?.street1}${
    campusLocation?.street2 ? ` ${campusLocation?.street2}` : ''
  }, ${campusLocation?.city}, ${campusLocation?.state} ${
    campusLocation?.postalCode
  }`;

  if (isOnline) {
    return (
      <OnlineCampusInfo
        campusName={campusName}
        digitalTourVideo={digitalTourVideo}
        phoneNumber={phoneNumber}
        additionalInfo={additionalInfo}
        serviceTimes={serviceTimes}
      />
    );
  }

  let campusHeadingLine: string;
  if (campusName === 'CF Everywhere') {
    campusHeadingLine = 'Christ Fellowship Church Online';
  } else if (campusName === 'Trinity') {
    campusHeadingLine = `Christ Fellowship Church Trinity in Palm Beach Gardens`;
  } else if (campusName.includes('Español') || campusName.includes('Espanol')) {
    const espanolCampusLocation = campusName
      .replace('Español', '')
      .replace('Espanol', '')
      .replace('Christ Fellowship', '')
      .trim();
    campusHeadingLine = `Christ Fellowship Español en ${espanolCampusLocation}, FL`;
  } else {
    campusHeadingLine = `Christ Fellowship Church in ${campusName}, FL`;
  }

  return (
    <div id='info' className='w-full content-padding'>
      <div className='mx-auto flex w-full max-w-screen-content flex-col gap-8 pt-16 pb-20 lg:flex-row lg:gap-12 lg:justify-between lg:pb-32'>
        {/* Location Info */}
        <div className='flex max-w-[646px] flex-1 flex-col gap-8 lg:pb-16'>
          {/* Campus Name Section*/}
          <div className='flex flex-col gap-3'>
            <div className='flex items-end gap-2 text-ocean'>
              <Icon name='church' className='lg:size-[40px] size-[24px]' />
              <p className='font-medium'>
                {isSpanish ? 'Ubicación del Campus' : 'Campus Location'}
              </p>
            </div>
            <h1 className='text-[24px] font-extrabold leading-tight text-[#2E2C2D] md:text-[36px] lg:text-[52px]'>
              {campusHeadingLine}
            </h1>
          </div>

          {/* Important Info Section */}
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-2'>
              <IconText
                icon='timeFive'
                serviceTimes={formattedServiceTimes(serviceTimes)}
              />
              <IconText icon='map' text={address} />
              <IconText icon='mobileAlt' text={phoneNumber} />
            </div>

            <div className='flex flex-col'>
              {additionalInfo.map((info, index) => (
                <p key={index} className='text-xs text-neutral-default'>
                  *{info}
                </p>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className='flex flex-col gap-16'>
            {/* Desktop CTAs */}
            <div className='hidden max-w-[450px] flex-col gap-8 lg:flex lg:items-start'>
              <CTAs isSpanish={isSpanish} />
              {weeklyMinistryServices && weeklyMinistryServices.length > 0 && (
                <DuringTheWeek
                  weeklyMinistryServices={weeklyMinistryServices}
                  isSpanish={isSpanish}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tour */}
        <div className='max-w-[670px] flex-1 lg:pt-16 mx-auto'>
          <VirtualTourTabs
            wistiaId={digitalTourVideo || ''}
            address={address}
            isSpanish={isSpanish}
          />
        </div>

        {/* Mobile CTAs */}
        <div className='flex flex-col gap-8 lg:gap-16 md:items-center lg:hidden'>
          <CTAs isSpanish={isSpanish} />
          {weeklyMinistryServices && weeklyMinistryServices.length > 0 && (
            <DuringTheWeek
              weeklyMinistryServices={weeklyMinistryServices}
              isSpanish={isSpanish}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const OnlineCampusInfo = ({
  campusName: _campusName,
  digitalTourVideo,
  phoneNumber,
  additionalInfo,
  serviceTimes,
}: CampusInfoProps) => {
  return (
    <div className='w-full content-padding'>
      <div className='mx-auto flex w-full max-w-screen-content flex-col gap-8 pt-16 pb-20 lg:flex-row lg:justify-between lg:pb-32'>
        {/* Location Info */}
        <div className='flex max-w-[900px] flex-1 flex-col gap-8 lg:pb-16'>
          {/* Campus Name Section*/}
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-ocean'>
              <Icon name='world' className='lg:size-[36px] size-[24px]' />
              <p className='font-medium'>Online Community</p>
            </div>
            <h1 className='text-[24px] font-extrabold leading-tight text-[#2E2C2D] md:text-[36px] lg:text-[52px]'>
              Christ Fellowship Church Online
            </h1>
          </div>

          {/* Important Info Section */}
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-2'>
              <IconText
                icon='timeFive'
                serviceTimes={formattedServiceTimes(serviceTimes)}
              />
              <IconText
                icon='station'
                text='Online Livestream Broadcasting from Palm Beach Gardens '
              />
              <IconText icon='mobileAlt' text={phoneNumber} />
            </div>

            <div className='flex flex-col'>
              {additionalInfo.map((info, index) => (
                <p key={index} className='text-xs text-neutral-default'>
                  *{info}
                </p>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className='flex flex-col gap-16'>
            {/* Desktop CTAs */}
            <div className='hidden max-w-[450px] flex-col gap-8 lg:flex'>
              <CTAs />
            </div>
          </div>
        </div>

        <div className='max-w-[670px] flex-1 lg:pt-16 mx-auto'>
          <VirtualTourTabs
            wistiaId={digitalTourVideo || 'khix40y1uf'}
            isOnline
          />
        </div>

        {/* Mobile CTAs */}
        <div className='flex flex-col gap-16 md:items-center lg:hidden'>
          <CTAs />
        </div>
      </div>
    </div>
  );
};
