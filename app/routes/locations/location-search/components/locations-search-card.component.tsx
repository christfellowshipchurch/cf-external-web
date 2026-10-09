import { Link } from 'react-router';
import heroBgImgStyles from '~/styles/hero-bg-image-styles';

export type LocationCardProps = {
  name: string;
  image: string;
  distanceFromLocation?: number;
  link: string;
};

const LocationCard = ({
  name,
  image,
  link,
  distanceFromLocation,
}: LocationCardProps) => {
  const coverLabel = distanceFromLocation || name?.includes('Online');

  return (
    <Link
      to={`/locations${link}`}
      prefetch='viewport'
      className='col-span-12 md:col-span-6 lg:col-span-4'
    >
      <div
        style={heroBgImgStyles(image)}
        className='relative h-[150px] w-[90vw] overflow-hidden rounded-md transition-transform duration-300 md:h-[250px] md:w-[340px] lg:h-[200px] lg:w-[300px] lg:hover:-translate-y-3 xl:h-[250px] xl:w-[340px]'
      >
        <div
          className='absolute size-full opacity-80'
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0), #353535)',
          }}
        />
        <h3 className='absolute bottom-0 left-0 pb-6 pl-6 text-2xl font-bold text-white'>
          {name}
        </h3>
        {coverLabel && distanceFromLocation && (
          <div className='absolute right-0 top-0 mr-[5px] mt-2 rounded-md bg-white'>
            <p className='px-3 py-0.5 text-[0.75rem] font-bold tracking-widest text-ocean'>
              {!name?.includes('Online')
                ? `${Number(distanceFromLocation).toFixed(1)} MILES`
                : 'RIGHT HERE!'}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
};

export default LocationCard;
