import {
  Outlet,
  useLocation,
  LoaderFunction,
  redirect,
} from 'react-router-dom';
import React from 'react';
import { cn } from '~/lib/utils';
import { YesWelcomeConfetti } from '~/routes/yes/components/yes-welcome-confetti.component';

export { meta } from './meta';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
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
    <div className={cn('relative min-h-screen flex flex-col', 'bg-ocean')}>
      {isWelcomeStep && <YesWelcomeConfetti />}
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
