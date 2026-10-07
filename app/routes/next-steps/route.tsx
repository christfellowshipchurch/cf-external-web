import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';
import { HeroSection } from './partials/hero.partial';
import { NextStepsSection } from './partials/next-steps.partial';
import { JourneySection } from './partials/journey.partial';
import { FAQSection } from './partials/faq.partial';
import { HelpSection } from './partials/help.partial';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Next Steps',
    description:
      'Find your next step at Christ Fellowship Church. Join a group, take a class, or serve with others.',
    path: '/next-steps',
  });
};

export default function NextSteps() {
  return (
    <div className='flex flex-col items-center justify-center w-full pb-16 bg-gray-50'>
      <HeroSection />
      <NextStepsSection />
      <JourneySection />
      <HelpSection />
      <FAQSection />
    </div>
  );
}
