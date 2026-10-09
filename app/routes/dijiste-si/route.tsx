import { Outlet, useLocation, LoaderFunction, redirect } from 'react-router';
import React from 'react';
import { cn } from '~/lib/utils';

export { meta } from './meta';

export const loader: LoaderFunction = async ({ url }) => {
  if (url.pathname === '/dijiste-si' || url.pathname === '/dijiste-si/') {
    return redirect('/dijiste-si/bienvenida');
  }
  return null;
};

export const DijisteSiRoute: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/');
  const currentStep = pathSegments[pathSegments.length - 1];
  const isWelcomeStep = currentStep === 'bienvenida';

  return (
    <div className={cn('min-h-screen flex flex-col', 'bg-ocean')}>
      <main
        className={cn(
          'flex flex-col items-center',
          isWelcomeStep && 'justify-center',
        )}
      >
        <div
          key={location.pathname}
          className='w-full'
          style={{
            animation: 'route-slide-in 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DijisteSiRoute;
