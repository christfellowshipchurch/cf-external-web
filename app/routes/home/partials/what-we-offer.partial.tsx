import { WhatWeOfferTabs } from '../components/we-offer-tabs/what-we-offer-tabs.component';

export function WhatWeOfferSection() {
  return (
    <section
      className='w-full py-16 md:pt-24 md:pb-20 bg-white relative z-30'
      id='something-for-everyone'
    >
      <div className='max-w-screen-content mx-auto flex w-full min-w-0 flex-col items-center gap-8 md:gap-12'>
        <WhatWeOfferTabs />
      </div>
    </section>
  );
}
