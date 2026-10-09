import { Hit } from 'algoliasearch';
import { Link } from 'react-router';
import { formattedServiceTimes } from '~/lib/utils';
import Icon from '~/primitives/icon';

export type CampusHitType = {
  campusUrl: string;
  campusName: string;
  geoloc: {
    latitude: number;
    longitude: number;
  };
  campusLocation: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
  };
  serviceTimes: string;
};
export function CampusHit({
  setSelectedLocation,
  redirect = true,
  hit,
}: {
  hit: Hit<CampusHitType> | CampusHitType;
  redirect?: boolean;
  setSelectedLocation?: (location: string) => void;
}) {
  if (redirect) {
    return (
      <Link
        to={`/locations/${hit.campusUrl}`}
        prefetch='intent'
        className='flex gap-2 w-full p-2'
      >
        <HitContent hit={hit} />
      </Link>
    );
  }
  return (
    <div
      className='flex gap-2 w-full p-2'
      onClick={() => setSelectedLocation?.(hit.campusName)}
    >
      <HitContent hit={hit} />
    </div>
  );
}

const HitContent = ({ hit }: { hit: Hit<CampusHitType> | CampusHitType }) => {
  const { street1, street2, city } = hit?.campusLocation || {};
  const serviceTimes = formattedServiceTimes(hit?.serviceTimes || '');
  const isOnline =
    hit?.campusUrl === 'cf-everywhere' ||
    hit?.campusName?.toLowerCase().includes('online');

  return (
    <>
      <Icon
        name={isOnline ? 'globe' : 'map'}
        className='text-black self-start'
        size={20}
      />
      <div className='flex flex-col'>
        <h3 className='text-xs text-black font-bold'>{hit.campusName}</h3>
        {isOnline ? (
          <p className='text-xs font-medium text-text-secondary'>
            On Demand on
          </p>
        ) : hit?.campusLocation ? (
          <p className='text-xs font-medium text-text-secondary'>
            {street1}
            {street2 && ` ${street2}`}, {city}
          </p>
        ) : null}
        <p className='text-xs text-black font-semibold'>
          {serviceTimes.map((service, index) => (
            <span key={index}>
              {service.day} at {service.hour.join(', ')}
            </span>
          ))}
        </p>
      </div>
    </>
  );
};
