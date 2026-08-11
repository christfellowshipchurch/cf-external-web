import { cn } from '~/lib/utils';

import { AnimatedStatValue } from '../components/animated-stat-value.component';

type ImpactStat = {
  value: string;
  label: string;
};

const IMPACT_STATS_ROW1: ImpactStat[] = [
  {
    value: '695k+',
    label: 'People impacted through our mission efforts',
  },
  { value: '13k+', label: 'Volunteers served' },
  {
    value: '8,010',
    label: 'People said “yes” to Jesus',
  },
  {
    value: '639k+',
    label: 'Kids received hot meals in 39 different countries',
  },
];

const IMPACT_STATS_ROW2: ImpactStat[] = [
  {
    value: '42k+',
    label: 'People served by the food truck in our community',
  },
  {
    value: '41',
    label: 'Disasters responded to locally & globally',
  },
  {
    value: '427k',
    label: 'Food distributed to the Missions Center',
  },
  {
    value: '2,794',
    label: 'People were baptized, declaring their faith',
  },
];

function StatCell({
  stat,
  statCounterIndex,
}: {
  stat: ImpactStat;
  statCounterIndex: number;
}) {
  return (
    <div className='flex min-w-0 flex-col gap-3'>
      <p className='text-[40px] font-black leading-none tracking-tight text-white md:text-[52px] lg:text-[72px]'>
        <AnimatedStatValue
          value={stat.value}
          statCounterIndex={statCounterIndex}
        />
      </p>
      <p className='text-pretty font-medium leading-snug text-ocean-web lg:text-lg'>
        {stat.label}
      </p>
    </div>
  );
}

function StatRow({
  items,
  className,
  counterIndexStart,
}: {
  items: ImpactStat[];
  className?: string;
  counterIndexStart: number;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 md:grid-cols-4 lg:gap-x-8',
        className,
      )}
    >
      {items.map((stat, idx) => (
        <StatCell
          key={stat.label}
          stat={stat}
          statCounterIndex={counterIndexStart + idx}
        />
      ))}
    </div>
  );
}

export function VolunteerStats() {
  return (
    <section
      id='stats'
      className='w-full bg-dark-navy text-white content-padding'
    >
      <div className='mx-auto flex w-full max-w-screen-content flex-col py-16 md:py-24 lg:py-28'>
        <header className='flex flex-col gap-4'>
          <div className='flex items-center gap-4'>
            <div className='h-1 w-8 shrink-0 bg-ocean-web' aria-hidden />
            <h3 className='text-xl font-extrabold leading-none text-ocean-web'>
              Impact 2025
            </h3>
          </div>
          <h2 className='text-pretty text-[32px] font-extrabold leading-tight text-white md:text-[40px] lg:text-[52px]'>
            Real Change{' '}
            <span className='hidden md:inline'>Through Collective Action</span>
          </h2>
        </header>

        <div
          className='my-10 h-px w-full bg-white/25 md:my-12 lg:my-14'
          role='presentation'
        />

        <div className='flex flex-col gap-10 pr-5 md:pr-12 lg:pr-0 md:gap-12 lg:gap-14'>
          <StatRow items={IMPACT_STATS_ROW1} counterIndexStart={0} />
          <div className='h-px w-full bg-white/25' role='presentation' />
          <StatRow
            items={IMPACT_STATS_ROW2}
            counterIndexStart={IMPACT_STATS_ROW1.length}
          />
        </div>
      </div>
    </section>
  );
}
