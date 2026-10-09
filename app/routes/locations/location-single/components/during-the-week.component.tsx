import { Link } from 'react-router';
import { Icon } from '~/primitives/icon/icon';
import { weekdaySpanishTranslation } from '../util';

export type WeeklyMinistryService = {
  ministryType?: string;
  dayOfWeek?: string;
  serviceTimes?: string;
  learnMoreUrl?: string;
  planAVisit?: boolean;
  planMyvisit?: string;
};

type WeeklyMinistryServiceDisplay = {
  ministryType: string;
  dayOfWeek: string;
  serviceTimes: string;
  learnMoreUrl: string;
};

const dayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const weekdayDisplayNames = dayOrder.reduce<Record<string, string>>(
  (acc, day) => {
    acc[day.toLowerCase()] = day;
    acc[`${day.toLowerCase()}s`] = day;
    return acc;
  },
  {},
);

const ministryDisplayNames: Record<string, string> = {
  'cf-kids': 'Kids',
  'kids-university': 'Kid U',
  students: 'Students',
  'the-mix': 'The Mix',
  'young-adults': 'Young Adults',
  'college-nights': 'College Nights',
  'celebrate-recovery': 'Celebrate Recovery',
};

function normalizeMinistryType(ministryType: string) {
  return ministryDisplayNames[ministryType] ?? ministryType;
}

function normalizeDaysOfWeek(dayOfWeek: string) {
  return dayOfWeek
    .split(',')
    .map((day) => day.trim())
    .map((day) => weekdayDisplayNames[day.toLowerCase()] ?? day)
    .filter((day) => dayOrder.includes(day));
}

function normalizeWeeklyMinistryService(
  service: WeeklyMinistryService,
): WeeklyMinistryServiceDisplay[] {
  const ministryType = (service.ministryType ?? '').trim();
  const daysOfWeek = (service.dayOfWeek ?? '').trim();
  const serviceTimes = (service.serviceTimes ?? '').trim();
  const learnMoreUrl = (service.learnMoreUrl ?? '').trim();

  if (!ministryType || !daysOfWeek || !serviceTimes) {
    return [];
  }

  return normalizeDaysOfWeek(daysOfWeek).map((dayOfWeek) => ({
    ministryType: normalizeMinistryType(ministryType),
    dayOfWeek,
    serviceTimes,
    learnMoreUrl,
  }));
}

export const DuringTheWeek = ({
  weeklyMinistryServices,
  isSpanish,
}: {
  weeklyMinistryServices: WeeklyMinistryService[];
  isSpanish?: boolean;
}) => {
  const displayServices = (weeklyMinistryServices ?? []).flatMap(
    normalizeWeeklyMinistryService,
  );

  const byDay = displayServices.reduce(
    (acc, item) => {
      const day = item.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    },
    {} as Record<string, WeeklyMinistryServiceDisplay[]>,
  );
  const orderedDays = dayOrder.filter((day) => byDay[day]?.length);

  return (
    <div className='flex w-full flex-col gap-3 rounded-2xl border border-neutral-lighter px-6 py-4 md:mx-auto md:max-w-xl md:px-8 lg:mx-0 lg:max-w-full'>
      <h3 className='text-lg font-semibold lg:text-[16px]'>
        {isSpanish ? 'Durante la semana' : 'During the Week'}
      </h3>
      <div className='flex flex-col gap-4 md:flex-row md:gap-1 md:justify-between lg:gap-2'>
        {orderedDays.map((day) => (
          <div key={day} className='flex flex-col gap-2'>
            <h4 className='font-semibold lg:text-xs'>
              {isSpanish ? weekdaySpanishTranslation(day) : day}
            </h4>
            <div className='flex flex-col md:gap-2'>
              {byDay[day].map((ministry, i) => (
                <p
                  key={i}
                  className='font-medium text-neutral-default md:max-w-[260px] lg:max-w-[180px] lg:text-xs'
                >
                  {ministry.serviceTimes} | {ministry.ministryType}{' '}
                  {ministry.learnMoreUrl ? (
                    <Link
                      to={ministry.learnMoreUrl}
                      className='inline align-middle'
                      aria-label={`${ministry.ministryType} Link`}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <Icon
                        name='linkExternal'
                        size={16}
                        className='mb-[3px] inline-block align-middle text-ocean'
                      />
                    </Link>
                  ) : null}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
