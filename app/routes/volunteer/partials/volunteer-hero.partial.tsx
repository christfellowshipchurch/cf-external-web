import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';

export const VolunteerHero = () => {
  return (
    <section aria-label='Volunteer Hero' className='bg-[#F1F4F5] w-full'>
      <div
        className={cn(
          'max-w-screen-content mx-auto',
          'px-5 md:px-12 lg:px-18 py-12 lg:py-24',
          'flex flex-col-reverse gap-10',
          'md:grid md:grid-cols-2 items-center md:gap-16',
        )}
      >
        {/* TEXT COLUMN */}
        <div className='flex flex-col gap-6 lg:gap-8'>
          {/* Custom Breadcrumbes */}
          <div className='hidden md:flex uppercase text-xs tracking-wider items-center gap-2'>
            <a
              className='text-navy hover:text-ocean transition-colors duration-300'
              href='/'
            >
              Home
            </a>
            <Icon name='chevronRight' size={16} className='text-navy' />
            <span>Volunteer</span>
          </div>

          {/* Heading */}
          <h1 className='font-extrabold heading-h1 text-[3rem] lg:text-[4.5rem] leading-[1.05] text-navy'>
            Find Your Place
            <br />
            <span className='text-[#0092BC]'>to Volunteer</span>
          </h1>

          {/* Body */}
          <p className='text-[#3F484C] text-lg lg:text-xl max-w-[520px]'>
            We want every volunteer&apos;s experience at church to be a
            fulfilling journey where they feel welcomed and can share the love
            of Jesus. Our hope is that every volunteer understands the impact
            they have, knowing they are making a difference in the lives of
            others.
          </p>

          {/* Buttons */}
          <div className='flex flex-col xl:flex-row gap-3 pt-2'>
            <Button
              intent='primary'
              href='/volunteer-form/welcome'
              className='w-full md:w-auto min-w-[250px] gap-2'
            >
              Find Your Fit
              <Icon name='arrowRight' size={18} className='text-white' />
            </Button>

            <Button
              intent='secondary'
              href='#church'
              className='w-full md:w-auto min-w-[240px]'
            >
              <span className='lg:hidden'>Browse All</span>
              <span className='hidden lg:inline'>Browse All Opportunities</span>
            </Button>
          </div>
        </div>

        {/* IMAGE COLUMN */}
        <div className='relative overflow-visible'>
          {/* Outer frame: aspect + tilt. Glow is a sibling behind the photo so it can bleed outside the rounded clip. */}
          <div className='relative lg:mx-auto w-full max-w-[512px] max-h-[407px] md:max-h-[640px] aspect-[326/407] overflow-visible rotate-1 md:rotate-3'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute z-0 -right-10 -top-12 size-[min(72vw,17.5rem)] sm:size-72 rounded-full bg-[#0092BC]/35 blur-3xl'
            />
            <div className='relative z-10 h-full w-full overflow-hidden rounded-[32px] shadow-2xl'>
              <img
                src='/assets/images/volunteer/hero.webp'
                alt='A volunteer smiling while serving food at a community event'
                fetchPriority='high'
                decoding='async'
                className='h-full w-full object-cover'
              />
            </div>
          </div>

          {/* Stat badge — desktop only; above photo (z-20 vs z-10) */}
          <div className='hidden lg:flex absolute bottom-6 -left-6 z-20 items-center gap-3 rounded-xl border border-white/60 bg-white/85 p-4 shadow-lg backdrop-blur-md backdrop-saturate-150'>
            <div className='size-10 rounded-lg bg-ocean flex items-center justify-center'>
              <Icon name='heart' size={20} className='text-white' />
            </div>
            <div>
              <div className='font-bold text-ocean text-xl leading-none'>
                695k+
              </div>
              <div className='text-xs uppercase tracking-wider text-secondary mt-1'>
                Lives Impacted
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
