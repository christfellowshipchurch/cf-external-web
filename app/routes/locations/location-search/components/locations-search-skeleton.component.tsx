import { Link } from 'react-router';
import './locations-search-skeleton.css'; // todo : figure out how load in css SSR, to remove error on console

const LocationSkeletonCard = () => {
  return (
    <div className='col-span-12 md:col-span-6 lg:col-span-4' id='results'>
      <div className='skeleton-card relative h-[150px] w-[90vw] rounded-md transition-transform duration-300 md:h-[250px] md:w-[340px] lg:h-[200px] lg:w-[300px] lg:hover:-translate-y-3 xl:h-[250px] xl:w-[340px]'>
        <div
          style={{
            boxShadow:
              '0 10px 15px -3px rgba(0, 0, 0, 0.1),0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }}
          className='absolute right-0 top-0 mr-[5px] mt-2 h-6 w-20 rounded-xl bg-white'
        ></div>
      </div>
    </div>
  );
};

export function LocationsLoader() {
  // Create an array of 15 (number of campuses) empty objects to map over and create skeleton cards
  const data = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
  return (
    <div className='flex w-full flex-col items-center'>
      <div className='grid max-w-[1100px] grid-cols-12 gap-5 md:gap-y-10'>
        {data?.map((_campus: unknown, index: number) => {
          return <LocationSkeletonCard key={index} />;
        })}
      </div>
      {/* Prison Location */}
      <div className='mt-24'>
        <Link to='/ministries/prison'>
          <div className='relative h-[150px] w-[90vw] rounded-md md:h-[250px] md:w-[600px]'>
            <div
              className='absolute size-full opacity-80'
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 0), #353535)',
              }}
            />
            <h3 className='absolute bottom-0 left-0 pb-6 pl-6 text-2xl font-bold text-white'>
              Prison Locations
            </h3>
          </div>
        </Link>
      </div>
    </div>
  );
}
