import type { LinksFunction } from 'react-router';
import { type MetaFunction } from 'react-router-dom';

import { BeliefsSection } from './about/partials/beliefs.partial';
import { HistorySection } from './about/partials/history.partial';
import { HeroSection } from './home/partials/hero.partial';
import { HomeDownloadAppSection } from './home/partials/home-download-app.partial';
import { SeniorPastorsSection } from './home/partials/senior-pastors.partial';
import { WhatWeOfferSection } from './home/partials/what-we-offer.partial';
import { createMeta } from '~/lib/meta-utils';

export { loader } from './home/loader';

export const links: LinksFunction = () => [
  {
    rel: 'preload',
    href: '/assets/images/home/bg-vid.webp',
    as: 'image',
    fetchPriority: 'high',
  },
];

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Christ Fellowship Church | Christian Church in South Florida',
    description:
      'Welcome to Christ Fellowship Church in South Florida! Join us in person or online for live worship music, biblical teachings, and programs for all ages.',
    path: '/',
  });
};

export default function HomePage() {
  return (
    <>
      <div className='w-screen h-screen absolute top-0 left-0 bg-white -z-100' />
      <HeroSection />
      <WhatWeOfferSection />
      <HistorySection sectionTitle='history' title='Who We Are' />
      <BeliefsSection />
      <SeniorPastorsSection />
      <HomeDownloadAppSection />
    </>
  );
}
