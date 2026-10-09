import {
  Outlet,
  useLocation,
  LoaderFunction,
  redirect,
} from 'react-router-dom';
import React from 'react';
import { cn } from '~/lib/utils';
import { YesWelcomeConfetti } from '~/routes/yes/components/yes-welcome-confetti.component';

// Step 1: Welcome
// Step 2: Personal Info
// Step 3: 21 Day Devotional

export { meta } from './meta';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  // If the path is exactly /yes (no trailing slash or anything after)
  if (url.pathname === '/yes' || url.pathname === '/yes/') {
    return redirect('/yes/welcome');
  }
  return null;
};

export const YesRoute: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/');
  const currentStep = pathSegments[pathSegments.length - 1];
  const isWelcomeStep = currentStep === 'welcome';

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

export default YesRoute;
