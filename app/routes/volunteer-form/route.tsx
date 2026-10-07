import { Outlet, useLocation } from 'react-router';
import React from 'react';
import { cn } from '~/lib/utils';
import { VolunteerFormNav } from '~/routes/volunteer-form/components/form-nav.component';

// Step 1: Welcome
// Step 2: Personal Info
// Step 3: Availability
// Step 4: Interests
// Step 5: Confirmation/Results

export { loader } from './loader';
export { meta } from './meta';

export const VolunteerFormRoute: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/');
  const currentStep = pathSegments[pathSegments.length - 1];
  const isWelcomeStep = currentStep === 'welcome';
  const isFormPage = ['about-you', 'availability', 'interests'].includes(
    currentStep,
  );

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        isWelcomeStep
          ? "bg-[url('/assets/images/volunteer-form/welcome-bg.webp')] bg-cover bg-center"
          : 'bg-white',
      )}
    >
      {isFormPage && <VolunteerFormNav currentStepId={currentStep} />}
      <main
        className={cn(
          'flex-1 flex flex-col items-center',
          isWelcomeStep && 'justify-center',
        )}
      >
        {/* Render the current step */}
        <Outlet />
      </main>
      {/* TODO: Add footer if needed */}
    </div>
  );
};

export default VolunteerFormRoute;
