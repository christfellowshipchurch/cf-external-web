import { type MetaFunction } from 'react-router-dom';
import { createMeta } from '~/lib/meta-utils';
import { DynamicHero } from '~/components/dynamic-hero';
import { OurMissionSection } from './partials/mission.partial';
import { HistorySection } from './partials/history.partial';
import { BeliefsSection } from './partials/beliefs.partial';
import { ImpactSection } from './partials/impact.partial';
import { SeniorPastorsSection } from '../home/partials/senior-pastors.partial';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'About Us',
    description:
      'Learn about Christ Fellowship Church: our mission, history, beliefs, and leadership team.',
    path: '/about',
  });
};

export default function AboutPage() {
  return (
    <main className='flex flex-col min-h-screen bg-white'>
      <DynamicHero
        customTitle='About Us'
        wistiaId='wcs977y9ac'
        overlay='none'
        ctas={[
          {
            title: 'Beliefs',
            href: '#beliefs',
          },
          {
            title: 'Leadership',
            href: '#leadership',
          },
        ]}
      />
      <OurMissionSection />
      <HistorySection />
      <BeliefsSection background='inverted' />
      <SeniorPastorsSection />
      <ImpactSection />
    </main>
  );
}
