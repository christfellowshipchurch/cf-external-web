import { SectionTitle } from '~/components/section-title';
import { GlobalMap } from '../components/global-map.component';
import { useLoaderData } from 'react-router';
import { Trip } from '../types';
import { VolunteerTripsCarousel } from '../components/mission-trips-carousel.component';

export function VolunteerGlobe() {
  const { volunteerTrips } = useLoaderData();
  const allTrips: Trip[] = Object.values(
    volunteerTrips as Record<string, Trip[]>,
  ).flat();

  return (
    <section
      id='globe'
      className='w-full bg-dark-navy text-white py-28 content-padding'
    >
      <div className='max-w-screen-content mx-auto'>
        <SectionTitle sectionTitle='Go further' color='#56c6f2' />
        <div className='flex flex-col gap-4 mt-3 mb-12'>
          <h2 className='heading-h2 text-[40px] md:text-6xl text-white'>
            Volunteer Around The Globe
          </h2>
          <p className='text-neutral-lighter text-lg'>
            Check out our current mission trip locations!{' '}
            <a
              href='https://cfmissions.managedmissions.com/OurTrips/840'
              target='_blank'
              rel='noopener noreferrer'
              className='underline text-ocean'
            >
              View all Trips
            </a>
          </p>
        </div>
        <div className='flex flex-col-reverse lg:flex-row items-center justify-center gap-12'>
          <div className='w-full lg:max-w-[480px] shrink-0'>
            <VolunteerTripsCarousel trips={allTrips} />
          </div>
          <div className='flex items-center justify-center w-full px-2 lg:px-0'>
            <GlobalMap trips={allTrips} />
          </div>
        </div>
      </div>
    </section>
  );
}
