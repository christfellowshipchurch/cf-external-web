import { Link } from 'react-router';
import type { VolunteerAtChurchResource } from '../../types';

export type VolunteerAtChurchCardProps = VolunteerAtChurchResource;

export const VolunteerAtChurchCard = ({
  resource,
}: {
  resource: VolunteerAtChurchCardProps;
}) => {
  return (
    <Link
      to={resource.pathname}
      prefetch='intent'
      className='flex flex-col rounded-[36px] overflow-hidden w-full max-w-[405px] h-full hover:translate-y-[-4px] transition-all duration-300'
    >
      <img
        className='w-full h-[164px] max-h-[192px] object-cover object-center bg-center'
        src={resource.image}
        alt={resource.name}
      />

      <div className='flex flex-col justify-between gap-8 p-6 pb-8 bg-white size-full'>
        <div className='flex flex-col gap-4 w-full'>
          <div className='flex items-center justify-center bg-ocean-subdued rounded-full w-fit px-3 py-1'>
            <p className='text-xs font-bold text-[#1C697E]'>{resource.tag}</p>
          </div>
          <h2 className='text-navy text-xl font-extrabold leading-none'>
            {resource.name}
          </h2>
          <p className='text-[#3F484C] text-sm'>{resource.description}</p>
        </div>
      </div>
    </Link>
  );
};
