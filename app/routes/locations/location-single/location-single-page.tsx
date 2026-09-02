import { useLoaderData } from 'react-router-dom';

import { LoaderReturnType } from './loader';
import { LocationSingle } from './partials/location-content';

export function LocationSinglePage() {
  const { location } = useLoaderData<LoaderReturnType>();

  return (
    <div className='min-h-screen'>
      <LocationSingle location={location} />
    </div>
  );
}
